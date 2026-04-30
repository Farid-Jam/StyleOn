from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path
from typing import Protocol
from uuid import uuid4

from app.config import Settings
from app.models import (
    CartItemInput,
    CartItemResponse,
    CartResponse,
    ColorPalette,
    ColorSwatch,
    Product,
    ProductFilters,
    SavedOutfitRequest,
    SavedOutfitResponse,
    TrendCollection,
)


class InventoryRepository(Protocol):
    def list_products(self, filters: ProductFilters) -> list[Product]:
        ...

    def get_products_by_ids(self, product_ids: list[str]) -> list[Product]:
        ...

    def list_trends(self) -> list[TrendCollection]:
        ...

    def get_color_palette(self, season: str) -> ColorPalette | None:
        ...

    def save_cart(self, session_id: str, items: list[CartItemInput]) -> CartResponse:
        ...

    def get_cart(self, cart_id: str) -> CartResponse | None:
        ...

    def save_outfit(self, request: SavedOutfitRequest) -> SavedOutfitResponse:
        ...

    def get_outfit(self, outfit_id: str) -> SavedOutfitResponse | None:
        ...


class MockInventoryRepository:
    _saved_carts: dict[str, CartResponse] = {}
    _saved_outfits: dict[str, SavedOutfitResponse] = {}

    def __init__(self, data_path: Path | None = None) -> None:
        self.data_path = data_path or Path(__file__).resolve().parents[1] / "data" / "mock_inventory.json"
        self._products = self._load_products()

    def _load_products(self) -> list[Product]:
        with self.data_path.open() as handle:
            return [Product.model_validate(row) for row in json.load(handle)]

    def list_products(self, filters: ProductFilters) -> list[Product]:
        products = [product for product in self._products if _matches(product, filters)]
        return products[: filters.limit]

    def get_products_by_ids(self, product_ids: list[str]) -> list[Product]:
        wanted = set(product_ids)
        return [product for product in self._products if product.id in wanted]

    def list_trends(self) -> list[TrendCollection]:
        return [
            TrendCollection(
                id="trend-warm-autumn-classic",
                name="Warm Autumn Classics",
                aesthetic="classic",
                description="Camel, olive, denim, and gold pieces for a polished warm palette.",
                season_palette=["Warm Autumn"],
                products=[
                    product
                    for product in self._products
                    if product.id in {"outer-001", "top-001", "bottom-001", "acc-001"}
                ],
            ),
            TrendCollection(
                id="trend-cool-street",
                name="Cool Street Staples",
                aesthetic="streetwear",
                description="High contrast basics with dark denim, white sneakers, and black frames.",
                season_palette=["Cool Winter", "Deep Winter"],
                products=[
                    product
                    for product in self._products
                    if product.id in {"bottom-001", "shoe-001", "acc-002"}
                ],
            ),
        ]

    def get_color_palette(self, season: str) -> ColorPalette | None:
        return _DEFAULT_COLOR_PALETTES.get(season)

    def save_cart(self, session_id: str, items: list[CartItemInput]) -> CartResponse:
        products_by_id = {product.id: product for product in self.get_products_by_ids([item.product_id for item in items])}
        cart_items = []
        for item in items:
            product = products_by_id[item.product_id]
            cart_items.append(
                CartItemResponse(
                    product=product,
                    quantity=item.quantity,
                    selected_size=item.selected_size,
                    line_total=product.price * item.quantity,
                )
            )
        response = CartResponse(
            id=f"cart-{uuid4().hex[:12]}",
            session_id=session_id,
            items=cart_items,
            total_price=sum((item.line_total for item in cart_items), Decimal("0")),
            currency=cart_items[0].product.currency if cart_items else "CAD",
        )
        self._saved_carts[response.id] = response
        return response

    def get_cart(self, cart_id: str) -> CartResponse | None:
        return self._saved_carts.get(cart_id)

    def save_outfit(self, request: SavedOutfitRequest) -> SavedOutfitResponse:
        products = self.get_products_by_ids(request.product_ids)
        response = SavedOutfitResponse(
            id=f"outfit-{uuid4().hex[:12]}",
            session_id=request.session_id,
            name=request.name,
            occasion=request.occasion,
            aesthetic=request.aesthetic,
            color_season=request.color_season,
            products=products,
            total_price=sum((product.price for product in products), Decimal("0")),
            currency=products[0].currency if products else "CAD",
        )
        self._saved_outfits[response.id] = response
        return response

    def get_outfit(self, outfit_id: str) -> SavedOutfitResponse | None:
        return self._saved_outfits.get(outfit_id)


class SnowflakeInventoryRepository:
    def __init__(self, settings: Settings) -> None:
        import snowflake.connector

        self.settings = settings
        self._connector = snowflake.connector

    def _connect(self):
        return self._connector.connect(
            account=self.settings.snowflake_account,
            user=self.settings.snowflake_user,
            password=self.settings.snowflake_password,
            role=self.settings.snowflake_role,
            warehouse=self.settings.snowflake_warehouse,
            database=self.settings.snowflake_database,
            schema=self.settings.snowflake_schema,
        )

    def list_products(self, filters: ProductFilters) -> list[Product]:
        where, params = _snowflake_where_clause(filters)
        query = f"""
            SELECT id, name, brand, category, subcategory, gender_fit, colors,
                   season_palette, aesthetic_tags, available_sizes, material, price, currency,
                   image_url, try_on_ready_image_url, product_url, source, description, in_stock
            FROM products
            {where}
            ORDER BY name
            LIMIT %(limit)s
        """
        params["limit"] = filters.limit
        return self._fetch_products(query, params)

    def get_products_by_ids(self, product_ids: list[str]) -> list[Product]:
        if not product_ids:
            return []
        placeholders = ", ".join(f"%(id_{index})s" for index, _ in enumerate(product_ids))
        params = {f"id_{index}": product_id for index, product_id in enumerate(product_ids)}
        query = f"""
            SELECT id, name, brand, category, subcategory, gender_fit, colors,
                   season_palette, aesthetic_tags, available_sizes, material, price, currency,
                   image_url, try_on_ready_image_url, product_url, source, description, in_stock
            FROM products
            WHERE id IN ({placeholders})
        """
        return self._fetch_products(query, params)

    def list_trends(self) -> list[TrendCollection]:
        query = """
            SELECT c.id, c.name, c.aesthetic, c.description, c.season_palette, i.product_id
            FROM trend_collections c
            JOIN trend_collection_items i ON c.id = i.collection_id
            ORDER BY c.name, i.product_id
        """
        with self._connect() as con:
            rows = con.cursor().execute(query).fetchall()
        product_ids = [row[5] for row in rows]
        products_by_id = {product.id: product for product in self.get_products_by_ids(product_ids)}
        collections: dict[str, TrendCollection] = {}
        for row in rows:
            collection_id, name, aesthetic, description, season_palette, product_id = row
            if collection_id not in collections:
                collections[collection_id] = TrendCollection(
                    id=collection_id,
                    name=name,
                    aesthetic=aesthetic,
                    description=description,
                    season_palette=_as_list(season_palette),
                    products=[],
                )
            product = products_by_id.get(product_id)
            if product:
                collections[collection_id].products.append(product)
        return list(collections.values())

    def get_color_palette(self, season: str) -> ColorPalette | None:
        query = """
            SELECT season, best_colors, neutral_colors, accent_colors, avoid_colors, description
            FROM color_palettes
            WHERE season = %(season)s
        """
        with self._connect() as con:
            row = con.cursor().execute(query, {"season": season}).fetchone()
        if not row:
            return _DEFAULT_COLOR_PALETTES.get(season)
        return ColorPalette(
            season=str(row[0]),
            best_colors=_as_swatches(row[1]),
            neutral_colors=_as_swatches(row[2]),
            accent_colors=_as_swatches(row[3]),
            avoid_colors=_as_swatches(row[4]),
            description=str(row[5] or ""),
        )

    def save_cart(self, session_id: str, items: list[CartItemInput]) -> CartResponse:
        products_by_id = {product.id: product for product in self.get_products_by_ids([item.product_id for item in items])}
        cart_id = f"cart-{uuid4().hex[:12]}"
        cart_items = []
        for item in items:
            product = products_by_id[item.product_id]
            line_total = product.price * item.quantity
            cart_items.append(
                CartItemResponse(
                    product=product,
                    quantity=item.quantity,
                    selected_size=item.selected_size,
                    line_total=line_total,
                )
            )
        total_price = sum((item.line_total for item in cart_items), Decimal("0"))
        currency = cart_items[0].product.currency if cart_items else "CAD"
        with self._connect() as con:
            cursor = con.cursor()
            cursor.execute(
                """
                INSERT INTO saved_carts (id, session_id, total_price, currency)
                VALUES (%(id)s, %(session_id)s, %(total_price)s, %(currency)s)
                """,
                {"id": cart_id, "session_id": session_id, "total_price": total_price, "currency": currency},
            )
            for cart_item in cart_items:
                cursor.execute(
                    """
                    INSERT INTO saved_cart_items (cart_id, product_id, quantity, selected_size, line_total)
                    VALUES (%(cart_id)s, %(product_id)s, %(quantity)s, %(selected_size)s, %(line_total)s)
                    """,
                    {
                        "cart_id": cart_id,
                        "product_id": cart_item.product.id,
                        "quantity": cart_item.quantity,
                        "selected_size": cart_item.selected_size,
                        "line_total": cart_item.line_total,
                    },
                )
        return CartResponse(
            id=cart_id,
            session_id=session_id,
            items=cart_items,
            total_price=total_price,
            currency=currency,
        )

    def get_cart(self, cart_id: str) -> CartResponse | None:
        with self._connect() as con:
            cursor = con.cursor()
            cart_row = cursor.execute(
                "SELECT id, session_id, total_price, currency FROM saved_carts WHERE id = %(id)s",
                {"id": cart_id},
            ).fetchone()
            if not cart_row:
                return None
            item_rows = cursor.execute(
                """
                SELECT product_id, quantity, selected_size, line_total
                FROM saved_cart_items
                WHERE cart_id = %(cart_id)s
                ORDER BY product_id
                """,
                {"cart_id": cart_id},
            ).fetchall()
        products_by_id = {product.id: product for product in self.get_products_by_ids([row[0] for row in item_rows])}
        items = [
            CartItemResponse(
                product=products_by_id[row[0]],
                quantity=int(row[1]),
                selected_size=row[2],
                line_total=Decimal(str(row[3])),
            )
            for row in item_rows
            if row[0] in products_by_id
        ]
        return CartResponse(
            id=str(cart_row[0]),
            session_id=str(cart_row[1]),
            items=items,
            total_price=Decimal(str(cart_row[2])),
            currency=str(cart_row[3]),
        )

    def save_outfit(self, request: SavedOutfitRequest) -> SavedOutfitResponse:
        products = self.get_products_by_ids(request.product_ids)
        products_by_id = {product.id: product for product in products}
        ordered_products = [products_by_id[product_id] for product_id in request.product_ids if product_id in products_by_id]
        outfit_id = f"outfit-{uuid4().hex[:12]}"
        total_price = sum((product.price for product in ordered_products), Decimal("0"))
        currency = ordered_products[0].currency if ordered_products else "CAD"
        with self._connect() as con:
            cursor = con.cursor()
            cursor.execute(
                """
                INSERT INTO saved_outfits
                    (id, session_id, name, occasion, aesthetic, color_season, total_price, currency)
                VALUES
                    (%(id)s, %(session_id)s, %(name)s, %(occasion)s, %(aesthetic)s, %(color_season)s,
                     %(total_price)s, %(currency)s)
                """,
                {
                    "id": outfit_id,
                    "session_id": request.session_id,
                    "name": request.name,
                    "occasion": request.occasion,
                    "aesthetic": request.aesthetic,
                    "color_season": request.color_season,
                    "total_price": total_price,
                    "currency": currency,
                },
            )
            for index, product in enumerate(ordered_products):
                cursor.execute(
                    """
                    INSERT INTO saved_outfit_items (outfit_id, product_id, sort_order)
                    VALUES (%(outfit_id)s, %(product_id)s, %(sort_order)s)
                    """,
                    {"outfit_id": outfit_id, "product_id": product.id, "sort_order": index},
                )
        return SavedOutfitResponse(
            id=outfit_id,
            session_id=request.session_id,
            name=request.name,
            occasion=request.occasion,
            aesthetic=request.aesthetic,
            color_season=request.color_season,
            products=ordered_products,
            total_price=total_price,
            currency=currency,
        )

    def get_outfit(self, outfit_id: str) -> SavedOutfitResponse | None:
        with self._connect() as con:
            cursor = con.cursor()
            outfit_row = cursor.execute(
                """
                SELECT id, session_id, name, occasion, aesthetic, color_season, total_price, currency
                FROM saved_outfits
                WHERE id = %(id)s
                """,
                {"id": outfit_id},
            ).fetchone()
            if not outfit_row:
                return None
            item_rows = cursor.execute(
                """
                SELECT product_id
                FROM saved_outfit_items
                WHERE outfit_id = %(outfit_id)s
                ORDER BY sort_order
                """,
                {"outfit_id": outfit_id},
            ).fetchall()
        products = self.get_products_by_ids([row[0] for row in item_rows])
        products_by_id = {product.id: product for product in products}
        ordered_products = [products_by_id[row[0]] for row in item_rows if row[0] in products_by_id]
        return SavedOutfitResponse(
            id=str(outfit_row[0]),
            session_id=str(outfit_row[1]),
            name=str(outfit_row[2]),
            occasion=outfit_row[3],
            aesthetic=outfit_row[4],
            color_season=outfit_row[5],
            products=ordered_products,
            total_price=Decimal(str(outfit_row[6])),
            currency=str(outfit_row[7]),
        )

    def _fetch_products(self, query: str, params: dict[str, object]) -> list[Product]:
        with self._connect() as con:
            rows = con.cursor().execute(query, params).fetchall()
        return [_row_to_product(row) for row in rows]


def get_inventory_repository(settings: Settings) -> InventoryRepository:
    if settings.use_snowflake:
        missing = [
            name
            for name in ("snowflake_account", "snowflake_user", "snowflake_password", "snowflake_warehouse")
            if not getattr(settings, name)
        ]
        if missing:
            raise RuntimeError(f"Missing Snowflake settings: {', '.join(missing)}")
        return SnowflakeInventoryRepository(settings)
    data_path = Path(settings.styleon_mock_inventory_path) if settings.styleon_mock_inventory_path else None
    return MockInventoryRepository(data_path)


def _matches(product: Product, filters: ProductFilters) -> bool:
    if filters.category and product.category != filters.category:
        return False
    if filters.color_season and filters.color_season not in product.season_palette:
        return False
    if filters.aesthetic and filters.aesthetic not in product.aesthetic_tags:
        return False
    if filters.min_price is not None and product.price < filters.min_price:
        return False
    if filters.max_price is not None and product.price > filters.max_price:
        return False
    if filters.gender_fit and product.gender_fit not in {filters.gender_fit, "unisex"}:
        return False
    if filters.search:
        haystack = " ".join(
            [
                product.name,
                product.brand,
                product.category,
                product.subcategory,
                product.description,
                " ".join(product.colors),
                " ".join(product.aesthetic_tags),
            ]
        ).lower()
        return filters.search.lower() in haystack
    return True


def _snowflake_where_clause(filters: ProductFilters) -> tuple[str, dict[str, object]]:
    clauses = ["in_stock = TRUE"]
    params: dict[str, object] = {}
    if filters.category:
        clauses.append("category = %(category)s")
        params["category"] = filters.category
    if filters.color_season:
        clauses.append("ARRAY_CONTAINS(%(color_season)s::VARIANT, season_palette)")
        params["color_season"] = filters.color_season
    if filters.aesthetic:
        clauses.append("ARRAY_CONTAINS(%(aesthetic)s::VARIANT, aesthetic_tags)")
        params["aesthetic"] = filters.aesthetic
    if filters.min_price is not None:
        clauses.append("price >= %(min_price)s")
        params["min_price"] = filters.min_price
    if filters.max_price is not None:
        clauses.append("price <= %(max_price)s")
        params["max_price"] = filters.max_price
    if filters.gender_fit:
        clauses.append("(gender_fit = %(gender_fit)s OR gender_fit = 'unisex')")
        params["gender_fit"] = filters.gender_fit
    if filters.search:
        clauses.append(
            "(LOWER(name) LIKE %(search)s OR LOWER(description) LIKE %(search)s OR LOWER(subcategory) LIKE %(search)s)"
        )
        params["search"] = f"%{filters.search.lower()}%"
    return "WHERE " + " AND ".join(clauses), params


def _row_to_product(row: tuple[object, ...]) -> Product:
    return Product(
        id=str(row[0]),
        name=str(row[1]),
        brand=str(row[2]),
        category=row[3],
        subcategory=str(row[4]),
        gender_fit=str(row[5]),
        colors=_as_list(row[6]),
        season_palette=_as_list(row[7]),
        aesthetic_tags=_as_list(row[8]),
        available_sizes=_as_list(row[9]),
        material=row[10],
        price=Decimal(str(row[11])),
        currency=str(row[12]),
        image_url=row[13],
        try_on_ready_image_url=row[14],
        product_url=row[15],
        source=str(row[16]),
        description=str(row[17] or ""),
        in_stock=bool(row[18]),
    )


def _as_list(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value]
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        except json.JSONDecodeError:
            return [item.strip() for item in value.split(",") if item.strip()]
    return list(value) if isinstance(value, tuple) else [str(value)]


def _as_swatches(value: object) -> list[ColorSwatch]:
    return [_color_swatch(color) for color in _as_list(value)]


def _color_swatch(name: str) -> ColorSwatch:
    normalized = name.strip().lower().replace("_", " ")
    hex_value = _COLOR_HEX.get(normalized, "#808080")
    return ColorSwatch(name=name, hex=hex_value, rgb=_hex_to_rgb(hex_value))


def _hex_to_rgb(hex_value: str) -> list[int]:
    cleaned = hex_value.lstrip("#")
    return [int(cleaned[index : index + 2], 16) for index in (0, 2, 4)]


_COLOR_HEX = {
    "antique gold": "#C9A646",
    "aqua": "#00FFFF",
    "beige": "#D8C3A5",
    "berry": "#8A2D52",
    "black": "#111111",
    "blue gray": "#6699CC",
    "burgundy": "#800020",
    "burnt orange": "#CC5500",
    "camel": "#C19A6B",
    "charcoal": "#36454F",
    "cobalt": "#0047AB",
    "cool gray": "#8C92AC",
    "cool taupe": "#8B8589",
    "coral": "#FF7F50",
    "cream": "#FFFDD0",
    "deep navy": "#000B3D",
    "dusty blue": "#6F8FAF",
    "dusty orange": "#D98559",
    "emerald": "#50C878",
    "espresso": "#3C2218",
    "fuchsia": "#FF00FF",
    "golden yellow": "#FFDF00",
    "green": "#228B22",
    "icy blue": "#D6F0FF",
    "icy pink": "#F7DDE8",
    "ivory": "#FFFFF0",
    "lavender": "#B57EDC",
    "light gold": "#FDDC5C",
    "mauve": "#E0B0FF",
    "muddy brown": "#6B4F2A",
    "mushroom": "#B8A99A",
    "mustard": "#FFDB58",
    "navy": "#000080",
    "neon pink": "#FF10F0",
    "neon yellow": "#FFFF33",
    "olive": "#708238",
    "orange": "#FFA500",
    "optic white": "#FDFDFD",
    "pastel peach": "#FFD1B3",
    "peach": "#FFE5B4",
    "pine green": "#01796F",
    "plum": "#673147",
    "poppy": "#E35335",
    "pure black": "#000000",
    "rose": "#C08081",
    "royal purple": "#7851A9",
    "ruby": "#E0115F",
    "rust": "#B7410E",
    "sage": "#9CAF88",
    "sapphire": "#0F52BA",
    "silver": "#C0C0C0",
    "slate blue": "#6A5ACD",
    "soft gray": "#B8B8B8",
    "soft navy": "#3B4C6B",
    "stark black": "#000000",
    "stark white": "#FFFFFF",
    "taupe": "#8B8589",
    "teal": "#008080",
    "terracotta": "#E2725B",
    "true red": "#BF0A30",
    "turquoise": "#40E0D0",
    "warm beige": "#D6B58C",
    "warm brown": "#8B5A2B",
    "warm gray": "#A89F91",
    "warm green": "#7BA05B",
    "white": "#FFFFFF",
}


_DEFAULT_COLOR_PALETTES = {
    "Warm Autumn": ColorPalette(
        season="Warm Autumn",
        best_colors=_as_swatches(["olive", "rust", "terracotta", "mustard", "warm brown"]),
        neutral_colors=_as_swatches(["cream", "camel", "espresso", "warm beige"]),
        accent_colors=_as_swatches(["teal", "burnt orange", "antique gold"]),
        avoid_colors=_as_swatches(["icy blue", "cool gray", "neon pink", "stark white"]),
        description="Warm, earthy colors with golden undertones.",
    ),
    "Cool Winter": ColorPalette(
        season="Cool Winter",
        best_colors=_as_swatches(["black", "white", "cobalt", "emerald", "true red"]),
        neutral_colors=_as_swatches(["charcoal", "navy", "cool gray"]),
        accent_colors=_as_swatches(["fuchsia", "royal purple", "silver"]),
        avoid_colors=_as_swatches(["camel", "mustard", "orange", "muddy brown"]),
        description="High contrast, crisp colors with cool undertones.",
    ),
    "Deep Winter": ColorPalette(
        season="Deep Winter",
        best_colors=_as_swatches(["black", "burgundy", "pine green", "deep navy", "plum"]),
        neutral_colors=_as_swatches(["charcoal", "espresso", "optic white"]),
        accent_colors=_as_swatches(["ruby", "sapphire", "icy pink"]),
        avoid_colors=_as_swatches(["pastel peach", "warm beige", "dusty orange"]),
        description="Deep, saturated colors with strong contrast.",
    ),
    "Soft Summer": ColorPalette(
        season="Soft Summer",
        best_colors=_as_swatches(["dusty blue", "mauve", "sage", "rose", "soft navy"]),
        neutral_colors=_as_swatches(["cool taupe", "soft gray", "mushroom"]),
        accent_colors=_as_swatches(["berry", "lavender", "slate blue"]),
        avoid_colors=_as_swatches(["neon yellow", "bright orange", "stark black"]),
        description="Muted, cool colors with gentle contrast.",
    ),
    "Warm Spring": ColorPalette(
        season="Warm Spring",
        best_colors=_as_swatches(["coral", "peach", "warm green", "turquoise", "golden yellow"]),
        neutral_colors=_as_swatches(["ivory", "camel", "warm taupe"]),
        accent_colors=_as_swatches(["poppy", "aqua", "light gold"]),
        avoid_colors=_as_swatches(["charcoal", "icy pink", "blue gray"]),
        description="Clear, warm colors with fresh golden brightness.",
    ),
}
