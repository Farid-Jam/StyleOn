from decimal import Decimal

from fastapi.testclient import TestClient

from app.main import app, inventory
from app.models import Product
from app.services.gemini_payload import product_to_gemini_payload


def _product(**overrides):
    values = {
        "id": "top-001",
        "name": "Oxford Blazer",
        "brand": "StyleOn",
        "category": "outerwear",
        "subcategory": "Blazer",
        "colors": ["navy"],
        "available_sizes": ["S", "M", "L"],
        "price": Decimal("89.00"),
        "image_url": "https://example.com/blazer.jpg",
        "try_on_ready_image_url": "https://example.com/blazer-cutout.png",
    }
    values.update(overrides)
    return Product(**values)


def test_top_product_payload_matches_gemini_try_on_shape():
    payload = product_to_gemini_payload(_product())

    assert payload["item_id"] == "top-001"
    assert payload["name"] == "Oxford Blazer"
    assert payload["category"] == "top"
    assert payload["image_url"] == "https://example.com/blazer-cutout.png"
    assert payload["fit_type"] == "regular"
    assert payload["stretch"] == "none"
    assert set(payload["sizes"]) == {"S", "M", "L"}
    assert set(payload["sizes"]["M"]) == {"chest", "sleeve", "collar", "length"}


def test_bottom_product_payload_uses_waist_and_inseam_sizes():
    payload = product_to_gemini_payload(
        _product(
            id="pants-001",
            name="Slim Chino",
            category="bottoms",
            subcategory="Pants",
            available_sizes=["28", "30", "32", "34"],
            image_url="https://example.com/chino.jpg",
            try_on_ready_image_url=None,
        )
    )

    assert payload["category"] == "bottom"
    assert payload["fit_type"] == "slim"
    assert payload["image_url"] == "https://example.com/chino.jpg"
    assert set(payload["sizes"]) == {"28x30", "30x30", "32x32", "34x32"}
    assert set(payload["sizes"]["32x32"]) == {"waist", "inseam", "thigh", "leg_opening", "rise"}


def test_watch_payload_uses_one_size_accessory_specs():
    payload = product_to_gemini_payload(
        _product(
            id="watch-001",
            name="Minimalist Field Watch",
            category="accessories",
            subcategory="Watch",
            available_sizes=[],
            image_url="https://example.com/watch.jpg",
        )
    )

    assert payload["category"] == "accessory"
    assert payload["accessory_type"] == "watch"
    assert payload["one_size"] is True
    assert payload["specs"]["case_diameter_mm"] == 40
    assert "sizes" not in payload


def test_try_on_gemini_payload_endpoint_preserves_requested_order():
    repo = _Repo(
        [
            _product(id="top-001", category="tops"),
            _product(id="pants-001", category="bottoms", available_sizes=["32"]),
        ]
    )
    app.dependency_overrides[inventory] = lambda: repo

    try:
        client = TestClient(app)
        response = client.post("/try-on/gemini-payload", json={"product_ids": ["pants-001", "top-001"]})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert [item["item_id"] for item in response.json()["items"]] == ["pants-001", "top-001"]


class _Repo:
    def __init__(self, products: list[Product]) -> None:
        self.products = products

    def get_products_by_ids(self, product_ids: list[str]) -> list[Product]:
        wanted = set(product_ids)
        return [product for product in self.products if product.id in wanted]
