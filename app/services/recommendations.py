from decimal import Decimal

from app.models import (
    ColorPalette,
    OutfitBuildRequest,
    OutfitRecommendationRequest,
    OutfitRecommendationResponse,
    OutfitResponse,
    Product,
    RecommendationReason,
    RecommendedOutfitItem,
    UserStyleProfile,
)


COMPLETE_OUTFIT_ORDER = ["tops", "bottoms", "outerwear", "shoes", "accessories"]
DEFAULT_RECOMMENDATION_ORDER = ["tops", "bottoms", "shoes", "outerwear", "accessories"]


def rank_products(
    products: list[Product],
    color_season: str | None = None,
    aesthetic: str | None = None,
    budget: Decimal | None = None,
) -> tuple[list[Product], list[RecommendationReason]]:
    scored: list[tuple[int, Product, list[str]]] = []
    for product in products:
        score = 0
        reasons: list[str] = []
        if color_season and color_season in product.season_palette:
            score += 50
            reasons.append(f"works with {color_season} colors")
        if aesthetic and aesthetic in product.aesthetic_tags:
            score += 30
            reasons.append(f"matches the {aesthetic} aesthetic")
        if budget is None or product.price <= budget:
            score += 10
            if budget is not None:
                reasons.append(f"keeps the item under {product.currency} {budget}")
        if product.category == "accessories":
            score += 5
            reasons.append("adds a finishing accessory")
        if not reasons:
            reasons.append("close match from available inventory")
        scored.append((score, product, reasons))

    scored.sort(key=lambda item: (-item[0], item[1].price, item[1].name))
    ranked_products = [product for _, product, _ in scored]
    ranking = [
        RecommendationReason(product_id=product.id, score=score, reasons=reasons)
        for score, product, reasons in scored
    ]
    return ranked_products, ranking


def build_outfit(request: OutfitBuildRequest, available_products: list[Product]) -> OutfitResponse:
    selected = list(available_products)
    selected_ids = {product.id for product in selected}

    if not request.product_ids:
        selected = []
        selected_ids = set()
        running_total = Decimal("0")
        for category in COMPLETE_OUTFIT_ORDER:
            candidates = [
                product
                for product in available_products
                if product.category == category and (request.budget is None or running_total + product.price <= request.budget)
            ]
            if candidates:
                product = sorted(candidates, key=lambda candidate: candidate.price)[0]
                if product.id not in selected_ids:
                    selected.append(product)
                    selected_ids.add(product.id)
                    running_total += product.price

    total = sum((product.price for product in selected), Decimal("0"))
    notes = []
    if request.color_season:
        notes.append(f"Built around {request.color_season} compatible pieces.")
    if request.budget is not None:
        if total <= request.budget:
            notes.append(f"Total stays under {selected[0].currency if selected else 'CAD'} {request.budget}.")
        else:
            notes.append(f"Total is over the requested budget of {request.budget}.")
    if not selected:
        notes.append("No exact outfit match found; loosen filters or add more seed products.")

    return OutfitResponse(
        name=_outfit_name(request),
        occasion=request.occasion,
        aesthetic=request.aesthetic,
        color_season=request.color_season,
        products=selected,
        total_price=total,
        currency=selected[0].currency if selected else "CAD",
        notes=notes,
    )


def recommend_outfit(
    request: OutfitRecommendationRequest,
    available_products: list[Product],
    palette: ColorPalette | None = None,
) -> OutfitRecommendationResponse:
    profile = request.user_profile
    selected: list[RecommendedOutfitItem] = []
    selected_ids: set[str] = set()
    running_total = Decimal("0")

    for category in _target_categories(profile):
        candidates = [
            product
            for product in available_products
            if product.category == category
            and product.id not in selected_ids
            and product.category not in profile.avoid_categories
            and (request.budget is None or running_total + product.price <= request.budget)
        ]
        if not candidates:
            continue
        scored = [_score_product(product, profile, request, palette) for product in candidates]
        scored.sort(key=lambda item: (-item.score, item.product.price, item.product.name))
        selected_item = scored[0]
        selected.append(selected_item)
        selected_ids.add(selected_item.product.id)
        running_total += selected_item.product.price
        if len(selected) >= request.max_items:
            break

    notes: list[str] = []
    if not selected:
        notes.append("No outfit match found; loosen budget or category preferences.")
    if request.budget is not None and running_total <= request.budget:
        notes.append(f"Total stays under {selected[0].product.currency if selected else 'CAD'} {request.budget}.")
    if palette:
        notes.append(f"Palette guidance uses {palette.season}.")

    return OutfitRecommendationResponse(
        name=_recommendation_name(request, palette),
        occasion=request.occasion,
        profile=profile,
        palette=palette,
        items=selected,
        total_price=running_total,
        currency=selected[0].product.currency if selected else "CAD",
        styling_summary=_styling_summary(selected, request, palette),
        notes=notes,
    )


def _outfit_name(request: OutfitBuildRequest) -> str:
    parts = [part for part in [request.color_season, request.aesthetic, request.occasion] if part]
    return " ".join(parts) + " Outfit" if parts else "Styleon Outfit"


def _target_categories(profile: UserStyleProfile) -> list[str]:
    categories = profile.preferred_categories or DEFAULT_RECOMMENDATION_ORDER
    ordered = [category for category in DEFAULT_RECOMMENDATION_ORDER if category in categories]
    extras = [category for category in categories if category not in ordered]
    return ordered + extras


def _score_product(
    product: Product,
    profile: UserStyleProfile,
    request: OutfitRecommendationRequest,
    palette: ColorPalette | None,
) -> RecommendedOutfitItem:
    score = 0
    reasons: list[str] = []
    selected_size = _selected_size(product, profile)

    color_season = profile.color_season
    if color_season and color_season in product.season_palette:
        score += 45
        reasons.append(f"matches {color_season} color season")

    product_colors = {color.lower() for color in product.colors}
    preferred_colors = {color.lower() for color in profile.preferred_colors}
    avoid_colors = {color.lower() for color in profile.avoid_colors}
    palette_colors = _palette_color_set(palette)
    palette_avoid = {color.name.lower() for color in (palette.avoid_colors if palette else [])}

    if product_colors & preferred_colors:
        score += 25
        reasons.append("uses a preferred color")
    if product_colors & palette_colors:
        score += 20
        reasons.append("fits the recommended palette")
    if product_colors & avoid_colors or product_colors & palette_avoid:
        score -= 35
        reasons.append("includes a color to be cautious with")

    vibe_matches = set(profile.style_vibes) & set(product.aesthetic_tags)
    if vibe_matches:
        score += 30 + (5 * len(vibe_matches))
        reasons.append(f"matches {', '.join(sorted(vibe_matches))} vibe")

    if product.category in profile.preferred_categories:
        score += 15
        reasons.append(f"fits preferred {product.category} category")

    if selected_size:
        score += 20
        reasons.append(f"available in size {selected_size}")

    product_fit = _fit_type(product)
    if profile.fit_preference and product_fit == profile.fit_preference:
        score += 15
        reasons.append(f"matches {profile.fit_preference} fit preference")

    if request.budget is None or product.price <= request.budget:
        score += 8

    if not reasons:
        reasons.append("solid catalog match for this outfit")

    return RecommendedOutfitItem(
        product=product,
        selected_size=selected_size,
        score=score,
        match_reasons=reasons,
    )


def _selected_size(product: Product, profile: UserStyleProfile) -> str | None:
    preferred = None
    if product.category in {"tops", "outerwear", "underwear"}:
        preferred = profile.top_size
    elif product.category == "bottoms":
        preferred = profile.bottom_size
    elif product.category == "shoes":
        preferred = profile.shoe_size
    if preferred and preferred in product.available_sizes:
        return preferred
    if preferred and "x" in preferred:
        waist = preferred.split("x", 1)[0]
        if waist in product.available_sizes:
            return waist
    return product.available_sizes[0] if product.available_sizes else None


def _palette_color_set(palette: ColorPalette | None) -> set[str]:
    if not palette:
        return set()
    return {
        color.name.lower()
        for color in palette.best_colors + palette.neutral_colors + palette.accent_colors
    }


def _fit_type(product: Product) -> str:
    text = f"{product.name} {product.subcategory} {' '.join(product.aesthetic_tags)}".lower()
    if any(word in text for word in ["slim", "skinny", "fitted"]):
        return "slim"
    if any(word in text for word in ["relaxed", "loose", "oversized"]):
        return "relaxed"
    return "regular"


def _recommendation_name(request: OutfitRecommendationRequest, palette: ColorPalette | None) -> str:
    profile = request.user_profile
    vibe = profile.style_vibes[0] if profile.style_vibes else None
    parts = [part for part in [palette.season if palette else profile.color_season, vibe, request.occasion] if part]
    return " ".join(parts) + " Outfit" if parts else "Recommended Styleon Outfit"


def _styling_summary(
    items: list[RecommendedOutfitItem],
    request: OutfitRecommendationRequest,
    palette: ColorPalette | None,
) -> str:
    if not items:
        return "No complete recommendation could be built from the current filters."
    pieces = [item.product.category for item in items]
    season = palette.season if palette else request.user_profile.color_season
    context = f" for {request.occasion}" if request.occasion else ""
    palette_text = f" and {season} colors" if season else ""
    return f"Built a {', '.join(pieces)} outfit{context} around your size profile, style preferences{palette_text}."
