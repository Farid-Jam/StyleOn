#!/usr/bin/env python3
"""Convert Kaggle fashion product images into Styleon inventory files.

Expected input folder:
  kaggle-fashion/
    styles.csv
    images/
      15970.jpg

Outputs:
  - JSON shaped like app.data.mock_inventory.json
  - CSV shaped for Snowflake PRODUCTS bulk loading
  - optional copied image subset for local/static demo serving
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import shutil
from decimal import Decimal
from pathlib import Path


SOURCE = "kaggle-paramaggarwal-fashion-products"
DEFAULT_IMAGE_URL_PREFIX = "/static/product-images"

STYLEON_FIELDS = [
    "id",
    "name",
    "brand",
    "category",
    "subcategory",
    "gender_fit",
    "colors",
    "season_palette",
    "aesthetic_tags",
    "available_sizes",
    "material",
    "price",
    "currency",
    "image_url",
    "try_on_ready_image_url",
    "product_url",
    "source",
    "description",
    "in_stock",
]

OUTERWEAR_TYPES = {
    "blazers",
    "coats",
    "jackets",
    "nehru jackets",
    "rain jacket",
    "sweaters",
    "sweatshirts",
    "waistcoat",
}

CATEGORY_BY_SUBCATEGORY = {
    "topwear": "tops",
    "bottomwear": "bottoms",
    "innerwear": "underwear",
    "shoes": "shoes",
    "sandal": "shoes",
    "flip flops": "shoes",
    "bags": "accessories",
    "watches": "accessories",
    "jewellery": "accessories",
    "eyewear": "accessories",
    "wallets": "accessories",
    "belts": "accessories",
    "headwear": "accessories",
    "accessories": "accessories",
}

PRICE_BASE_BY_CATEGORY = {
    "tops": Decimal("34.00"),
    "bottoms": Decimal("48.00"),
    "outerwear": Decimal("88.00"),
    "underwear": Decimal("22.00"),
    "shoes": Decimal("68.00"),
    "accessories": Decimal("26.00"),
}

PALETTES_BY_COLOR = {
    "black": ["Deep Winter", "Cool Winter"],
    "blue": ["Cool Winter", "Soft Summer"],
    "navy blue": ["Deep Winter", "Cool Winter", "Soft Summer"],
    "white": ["Cool Winter", "Clear Spring"],
    "grey": ["Soft Summer", "Cool Winter"],
    "silver": ["Cool Winter", "Soft Summer"],
    "green": ["Warm Autumn", "Soft Autumn"],
    "olive": ["Warm Autumn", "Soft Autumn"],
    "brown": ["Warm Autumn", "Soft Autumn"],
    "tan": ["Warm Autumn", "Warm Spring"],
    "beige": ["Soft Autumn", "Warm Spring"],
    "khaki": ["Warm Autumn", "Soft Autumn"],
    "gold": ["Warm Autumn", "Warm Spring"],
    "yellow": ["Warm Spring", "Clear Spring"],
    "orange": ["Warm Autumn", "Warm Spring"],
    "red": ["Deep Winter", "Warm Autumn"],
    "maroon": ["Deep Winter", "Warm Autumn"],
    "burgundy": ["Deep Winter", "Cool Winter"],
    "pink": ["Soft Summer", "Clear Spring"],
    "purple": ["Cool Winter", "Soft Summer"],
    "lavender": ["Soft Summer", "Cool Summer"],
    "cream": ["Warm Spring", "Soft Autumn"],
}

USAGE_TAGS = {
    "formal": ["workwear", "classic"],
    "casual": ["everyday", "minimal"],
    "smart casual": ["smart casual", "classic"],
    "sports": ["athleisure", "sporty"],
    "party": ["night out", "statement"],
    "ethnic": ["traditional", "occasionwear"],
    "travel": ["travel", "comfortable"],
    "home": ["loungewear", "basics"],
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Styleon inventory from Kaggle fashion product images.")
    parser.add_argument("--input-dir", required=True, type=Path, help="Folder containing styles.csv and images/.")
    parser.add_argument("--output-json", type=Path, default=Path("app/data/kaggle_inventory.json"))
    parser.add_argument("--output-csv", type=Path, default=Path("data/kaggle_products.csv"))
    parser.add_argument("--image-output-dir", type=Path, default=Path("app/static/product-images"))
    parser.add_argument("--image-url-prefix", default=DEFAULT_IMAGE_URL_PREFIX)
    parser.add_argument("--limit", type=int, default=1000)
    parser.add_argument("--copy-images", action="store_true")
    args = parser.parse_args()

    products = ingest_kaggle(
        input_dir=args.input_dir,
        limit=args.limit,
        image_output_dir=args.image_output_dir,
        image_url_prefix=args.image_url_prefix,
        copy_images=args.copy_images,
    )
    write_json(products, args.output_json)
    write_csv(products, args.output_csv)
    print(f"Wrote {len(products)} products to {args.output_json} and {args.output_csv}")


def ingest_kaggle(
    input_dir: Path,
    limit: int = 1000,
    image_output_dir: Path | None = None,
    image_url_prefix: str = DEFAULT_IMAGE_URL_PREFIX,
    copy_images: bool = False,
) -> list[dict[str, object]]:
    styles_path = input_dir / "styles.csv"
    images_dir = input_dir / "images"
    if not styles_path.exists():
        raise FileNotFoundError(f"Missing styles.csv at {styles_path}")
    if not images_dir.exists():
        raise FileNotFoundError(f"Missing images directory at {images_dir}")

    products: list[dict[str, object]] = []
    if copy_images and image_output_dir:
        image_output_dir.mkdir(parents=True, exist_ok=True)

    with styles_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            product = transform_row(row, images_dir, image_url_prefix)
            if product is None:
                continue
            image_path = images_dir / f"{product['id']}.jpg"
            if copy_images and image_output_dir and image_path.exists():
                shutil.copy2(image_path, image_output_dir / image_path.name)
            products.append(product)
            if len(products) >= limit:
                break
    return products


def transform_row(row: dict[str, str], images_dir: Path, image_url_prefix: str) -> dict[str, object] | None:
    raw_id = clean(row.get("id"))
    name = clean(row.get("productDisplayName"))
    subcategory = clean(row.get("subCategory"))
    article_type = clean(row.get("articleType"))
    color = clean(row.get("baseColour"))
    if not raw_id or not name or not subcategory or not article_type:
        return None

    category = map_category(subcategory, article_type)
    if category is None:
        return None

    image_path = images_dir / f"{raw_id}.jpg"
    image_url = f"{image_url_prefix.rstrip('/')}/{raw_id}.jpg" if image_path.exists() else None
    colors = [color.lower()] if color else []
    usage = clean(row.get("usage"))
    gender = normalize_gender(clean(row.get("gender")))

    return {
        "id": raw_id,
        "name": name,
        "brand": derive_brand(name),
        "category": category,
        "subcategory": article_type.lower(),
        "gender_fit": gender,
        "colors": colors,
        "season_palette": derive_color_palettes(color),
        "aesthetic_tags": derive_aesthetic_tags(usage, article_type, category, color),
        "available_sizes": derive_available_sizes(raw_id, category, article_type, gender),
        "material": None,
        "price": str(generate_price(raw_id, category, article_type)),
        "currency": "CAD",
        "image_url": image_url,
        "try_on_ready_image_url": image_url,
        "product_url": None,
        "source": SOURCE,
        "description": build_description(name, color, usage, article_type),
        "in_stock": True,
    }


def map_category(subcategory: str, article_type: str) -> str | None:
    article_key = article_type.lower()
    if article_key in OUTERWEAR_TYPES:
        return "outerwear"
    return CATEGORY_BY_SUBCATEGORY.get(subcategory.lower())


def normalize_gender(gender: str) -> str:
    value = gender.lower()
    if value in {"men", "women", "boys", "girls", "unisex"}:
        return value
    return "unisex"


def derive_brand(name: str) -> str:
    first_word = name.split()[0].strip(" -")
    if first_word and first_word.lower() not in {"men", "women", "unisex", "boys", "girls"}:
        return first_word
    return "Kaggle Fashion"


def derive_color_palettes(color: str) -> list[str]:
    normalized = color.lower()
    if not normalized:
        return ["Warm Autumn", "Cool Winter", "Soft Summer"]
    if normalized in PALETTES_BY_COLOR:
        return PALETTES_BY_COLOR[normalized]
    for key, palettes in PALETTES_BY_COLOR.items():
        if key in normalized:
            return palettes
    return ["Warm Autumn", "Cool Winter", "Soft Summer"]


def derive_aesthetic_tags(usage: str, article_type: str, category: str, color: str) -> list[str]:
    tags = set(USAGE_TAGS.get(usage.lower(), []))
    article = article_type.lower()
    color_value = color.lower()
    if category == "accessories":
        tags.add("finishing piece")
        if any(word in article for word in ["watch", "bracelet", "ring", "earring", "necklace"]):
            tags.add("jewelry")
        if any(word in article for word in ["sunglasses", "glasses"]):
            tags.add("eyewear")
        if any(word in article for word in ["bag", "wallet"]):
            tags.add("bags")
    if color_value in {"black", "white", "grey", "navy blue"}:
        tags.add("minimal")
    if color_value in {"brown", "tan", "beige", "khaki", "olive", "green"}:
        tags.add("earthy")
    if "jeans" in article:
        tags.add("streetwear")
    return sorted(tags or {"everyday"})


def generate_price(product_id: str, category: str, article_type: str) -> Decimal:
    base = PRICE_BASE_BY_CATEGORY[category]
    digest = hashlib.sha256(f"{product_id}:{article_type}".encode("utf-8")).hexdigest()
    offset = Decimal(int(digest[:2], 16) % 34)
    if article_type.lower() in OUTERWEAR_TYPES:
        offset += Decimal("24")
    return (base + offset).quantize(Decimal("0.01"))


def derive_available_sizes(product_id: str, category: str, article_type: str, gender: str) -> list[str]:
    article = article_type.lower()
    if category in {"tops", "outerwear", "underwear"}:
        sizes = ["XS", "S", "M", "L", "XL"]
        if gender in {"men", "unisex"}:
            sizes.append("XXL")
        return stable_subset(product_id, sizes, minimum=3)
    if category == "bottoms":
        if "skirt" in article:
            return stable_subset(product_id, ["XS", "S", "M", "L", "XL"], minimum=3)
        return stable_subset(product_id, ["28", "30", "32", "34", "36", "38"], minimum=3)
    if category == "shoes":
        if gender == "women":
            return stable_subset(product_id, ["5", "6", "7", "8", "9", "10"], minimum=3)
        if gender in {"boys", "girls"}:
            return stable_subset(product_id, ["1", "2", "3", "4", "5", "6"], minimum=3)
        return stable_subset(product_id, ["7", "8", "9", "10", "11", "12"], minimum=3)
    if category == "accessories":
        if any(word in article for word in ["belt", "cap", "hat"]):
            return stable_subset(product_id, ["S", "M", "L"], minimum=2)
        return ["One Size"]
    return []


def stable_subset(product_id: str, sizes: list[str], minimum: int) -> list[str]:
    digest = hashlib.sha256(f"sizes:{product_id}".encode("utf-8")).digest()
    selected = [size for index, size in enumerate(sizes) if digest[index % len(digest)] % 3 != 0]
    if len(selected) < minimum:
        return sizes[:minimum]
    return selected


def build_description(name: str, color: str, usage: str, article_type: str) -> str:
    pieces = [name]
    if color:
        pieces.append(f"base color: {color}")
    if usage:
        pieces.append(f"usage: {usage}")
    pieces.append(f"type: {article_type}")
    pieces.append("estimated demo price")
    return "; ".join(pieces)


def write_json(products: list[dict[str, object]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        json.dump(products, handle, indent=2)
        handle.write("\n")


def write_csv(products: list[dict[str, object]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=STYLEON_FIELDS)
        writer.writeheader()
        for product in products:
            row = product.copy()
            row["colors"] = json.dumps(row["colors"])
            row["season_palette"] = json.dumps(row["season_palette"])
            row["aesthetic_tags"] = json.dumps(row["aesthetic_tags"])
            row["available_sizes"] = json.dumps(row["available_sizes"])
            writer.writerow(row)


def clean(value: str | None) -> str:
    if value is None:
        return ""
    value = value.strip()
    return "" if value.lower() in {"nan", "none", "null"} else value


if __name__ == "__main__":
    main()
