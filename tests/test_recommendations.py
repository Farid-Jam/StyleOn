from decimal import Decimal
from pathlib import Path

from app.config import Settings
from app.models import OutfitBuildRequest, OutfitRecommendationRequest, ProductFilters, UserStyleProfile
from app.services.inventory import MockInventoryRepository, get_inventory_repository
from app.services.recommendations import build_outfit, rank_products, recommend_outfit


def test_mock_inventory_filters_by_color_season_and_budget():
    repo = MockInventoryRepository()
    products = repo.list_products(ProductFilters(color_season="Warm Autumn", max_price=Decimal("60")))

    assert products
    assert all("Warm Autumn" in product.season_palette for product in products)
    assert all(product.price <= Decimal("60") for product in products)
    assert all(product.available_sizes for product in products)


def test_rank_products_explains_color_and_budget_matches():
    repo = MockInventoryRepository()
    products = repo.list_products(ProductFilters(limit=100))

    ranked, reasons = rank_products(products, color_season="Warm Autumn", aesthetic="minimal", budget=Decimal("80"))

    assert ranked[0].id in {reason.product_id for reason in reasons}
    assert any("Warm Autumn" in " ".join(reason.reasons) for reason in reasons)
    assert reasons[0].score >= reasons[-1].score


def test_build_outfit_selects_multiple_categories_under_budget():
    repo = MockInventoryRepository()
    products = repo.list_products(ProductFilters(color_season="Warm Autumn", limit=100))

    outfit = build_outfit(
        OutfitBuildRequest(color_season="Warm Autumn", aesthetic="minimal", budget=Decimal("250")),
        products,
    )

    assert outfit.products
    assert outfit.total_price <= Decimal("250")
    assert len({product.category for product in outfit.products}) >= 2


def test_recommend_outfit_uses_profile_sizes_palette_and_reasons():
    repo = MockInventoryRepository()
    products = repo.list_products(ProductFilters(limit=100))
    palette = repo.get_color_palette("Warm Autumn")

    recommendation = recommend_outfit(
        OutfitRecommendationRequest(
            user_profile=UserStyleProfile(
                top_size="M",
                bottom_size="32x32",
                shoe_size="10",
                fit_preference="regular",
                style_vibes=["minimal"],
                preferred_categories=["tops", "bottoms", "shoes"],
                color_season="Warm Autumn",
                preferred_colors=["olive", "camel"],
            ),
            occasion="casual dinner",
            budget=Decimal("250"),
        ),
        products,
        palette,
    )

    assert recommendation.items
    assert recommendation.palette is not None
    assert recommendation.palette.season == "Warm Autumn"
    assert recommendation.palette.best_colors[0].name == "olive"
    assert recommendation.palette.best_colors[0].hex == "#708238"
    assert recommendation.palette.best_colors[0].rgb == [112, 130, 56]
    assert recommendation.total_price <= Decimal("250")
    assert all(item.selected_size for item in recommendation.items)
    assert any("size" in " ".join(item.match_reasons) for item in recommendation.items)
    assert any("palette" in " ".join(item.match_reasons) for item in recommendation.items)


def test_mock_inventory_can_use_configured_data_path():
    data_path = Path("app/data/kaggle_inventory.json")
    if not data_path.exists():
        return

    repo = get_inventory_repository(
        Settings(styleon_data_mode="mock", styleon_mock_inventory_path=str(data_path))
    )
    products = repo.list_products(ProductFilters(limit=5))

    assert products
    assert all(product.source == "kaggle-paramaggarwal-fashion-products" for product in products)
