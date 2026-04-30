import csv
from pathlib import Path

from scripts.ingest_kaggle import derive_available_sizes, derive_color_palettes, ingest_kaggle, map_category


def test_category_mapping_covers_core_kaggle_groups():
    assert map_category("Topwear", "Shirts") == "tops"
    assert map_category("Bottomwear", "Jeans") == "bottoms"
    assert map_category("Innerwear", "Briefs") == "underwear"
    assert map_category("Shoes", "Casual Shoes") == "shoes"
    assert map_category("Sandal", "Sandals") == "shoes"
    assert map_category("Flip Flops", "Flip Flops") == "shoes"
    assert map_category("Watches", "Watches") == "accessories"
    assert map_category("Bags", "Handbags") == "accessories"
    assert map_category("Jewellery", "Bracelet") == "accessories"
    assert map_category("Eyewear", "Sunglasses") == "accessories"
    assert map_category("Topwear", "Jackets") == "outerwear"


def test_common_colors_get_styleon_palettes():
    for color in ["Black", "Blue", "White", "Red", "Green", "Brown", "Gold", "Silver"]:
        assert derive_color_palettes(color)


def test_available_sizes_match_category_shape():
    assert {"S", "M"} & set(derive_available_sizes("1", "tops", "Shirts", "men"))
    assert {"30", "32", "34"} & set(derive_available_sizes("2", "bottoms", "Jeans", "men"))
    assert {"7", "8", "9"} & set(derive_available_sizes("3", "shoes", "Sports Shoes", "men"))
    assert derive_available_sizes("4", "accessories", "Bracelet", "women") == ["One Size"]


def test_ingest_kaggle_generates_products_with_prices_and_image_urls(tmp_path: Path):
    input_dir = tmp_path / "kaggle"
    images_dir = input_dir / "images"
    images_dir.mkdir(parents=True)
    styles_path = input_dir / "styles.csv"

    rows = [
        {
            "id": "15970",
            "gender": "Men",
            "masterCategory": "Apparel",
            "subCategory": "Topwear",
            "articleType": "Shirts",
            "baseColour": "Navy Blue",
            "season": "Fall",
            "year": "2011",
            "usage": "Casual",
            "productDisplayName": "Turtle Check Men Navy Blue Shirt",
        },
        {
            "id": "59263",
            "gender": "Women",
            "masterCategory": "Accessories",
            "subCategory": "Watches",
            "articleType": "Watches",
            "baseColour": "Silver",
            "season": "Winter",
            "year": "2016",
            "usage": "Casual",
            "productDisplayName": "Titan Women Silver Watch",
        },
    ]

    with styles_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    for row in rows:
        (images_dir / f"{row['id']}.jpg").write_bytes(b"fake image")

    output_images = tmp_path / "static-images"
    products = ingest_kaggle(
        input_dir=input_dir,
        limit=20,
        image_output_dir=output_images,
        image_url_prefix="/static/product-images",
        copy_images=True,
    )

    assert len(products) == 2
    assert products[0]["category"] == "tops"
    assert products[1]["category"] == "accessories"
    assert all(float(product["price"]) > 0 for product in products)
    assert all(product["season_palette"] for product in products)
    assert all(product["available_sizes"] for product in products)
    assert all(str(product["image_url"]).startswith("/static/product-images/") for product in products)
    assert (output_images / "15970.jpg").exists()
    assert (output_images / "59263.jpg").exists()
