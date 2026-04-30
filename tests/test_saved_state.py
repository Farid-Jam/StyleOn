from app.models import CartItemInput, ProductFilters, SavedOutfitRequest
from app.services.inventory import MockInventoryRepository


def test_mock_repository_saves_and_fetches_cart():
    repo = MockInventoryRepository()
    product = repo.list_products(ProductFilters(limit=1))[0]

    saved = repo.save_cart(
        "test-session",
        [CartItemInput(product_id=product.id, quantity=2, selected_size=product.available_sizes[0])],
    )
    fetched = repo.get_cart(saved.id)

    assert fetched is not None
    assert fetched.session_id == "test-session"
    assert fetched.items[0].product.id == product.id
    assert fetched.items[0].line_total == product.price * 2


def test_mock_repository_saves_and_fetches_outfit():
    repo = MockInventoryRepository()
    products = repo.list_products(ProductFilters(limit=3))

    saved = repo.save_outfit(
        SavedOutfitRequest(
            session_id="test-session",
            name="Demo Outfit",
            product_ids=[product.id for product in products],
            color_season="Warm Autumn",
        )
    )
    fetched = repo.get_outfit(saved.id)

    assert fetched is not None
    assert fetched.name == "Demo Outfit"
    assert [product.id for product in fetched.products] == [product.id for product in products]
    assert fetched.total_price == sum(product.price for product in products)
