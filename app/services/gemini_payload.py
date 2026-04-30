from __future__ import annotations

import hashlib

from app.models import Product


def product_to_gemini_payload(product: Product) -> dict[str, object]:
    category = _gemini_category(product)
    payload: dict[str, object] = {
        "item_id": product.id,
        "name": product.name,
        "category": category,
        "image_url": product.try_on_ready_image_url or product.image_url,
    }

    if category == "accessory":
        payload.update(_accessory_payload(product))
        return payload

    payload["sizes"] = _sizes_payload(product, category)
    payload["fit_type"] = _fit_type(product)
    payload["stretch"] = _stretch(product)
    return payload


def products_to_gemini_payload(products: list[Product]) -> dict[str, object]:
    return {"items": [product_to_gemini_payload(product) for product in products]}


def _gemini_category(product: Product) -> str:
    if product.category == "bottoms":
        return "bottom"
    if product.category == "accessories":
        return "accessory"
    if product.category == "shoes":
        return "shoe"
    return "top"


def _sizes_payload(product: Product, category: str) -> dict[str, dict[str, float]]:
    sizes = product.available_sizes or ["M"]
    if category == "bottom":
        return {_pants_size_label(size): _bottom_measurements(size, product.id) for size in sizes}
    if category == "shoe":
        return {size: _shoe_measurements(size) for size in sizes}
    return {size: _top_measurements(size, product.id) for size in sizes}


def _top_measurements(size: str, product_id: str) -> dict[str, float]:
    base = {
        "XS": (34, 22.5, 14, 26),
        "S": (38, 23.5, 15, 27),
        "M": (42, 25, 16, 28),
        "L": (46, 26, 17, 29),
        "XL": (50, 27, 18, 30),
        "XXL": (54, 28, 19, 31),
    }.get(size, (42, 25, 16, 28))
    variance = _small_variance(product_id, size)
    chest, sleeve, collar, length = base
    return {
        "chest": chest + variance,
        "sleeve": sleeve + (variance * 0.25),
        "collar": collar + (variance * 0.15),
        "length": length + (variance * 0.2),
    }


def _bottom_measurements(size: str, product_id: str) -> dict[str, float]:
    waist = _to_number(size, default=32)
    inseam = 30 if waist <= 30 else 32
    variance = _small_variance(product_id, size)
    return {
        "waist": waist,
        "inseam": inseam,
        "thigh": round((waist * 0.68) + variance, 1),
        "leg_opening": round((waist * 0.44) + (variance * 0.25), 1),
        "rise": round(9.5 + ((waist - 28) * 0.25), 1),
    }


def _shoe_measurements(size: str) -> dict[str, float]:
    shoe_size = _to_number(size, default=9)
    return {
        "us_size": shoe_size,
        "foot_length_cm": round(22.1 + (shoe_size * 0.85), 1),
    }


def _accessory_payload(product: Product) -> dict[str, object]:
    subcategory = product.subcategory.lower()
    if "watch" in subcategory:
        return {
            "accessory_type": "watch",
            "one_size": True,
            "specs": {
                "case_diameter_mm": 40,
                "lug_width_mm": 20,
                "band_length_mm": 120,
                "band_material": "leather",
            },
            "fit_note": "Fits wrists 6-8 inches. Adjustable band.",
        }
    if "belt" in subcategory:
        return {
            "accessory_type": "belt",
            "one_size": False,
            "sizes": {
                size: {"waist_range_inches": _belt_range(size)}
                for size in (product.available_sizes or ["M"])
            },
            "fit_note": "Demo sizing uses approximate adjustable belt ranges.",
        }
    return {
        "accessory_type": subcategory.replace(" ", "_"),
        "one_size": True,
        "specs": {},
        "fit_note": "One size accessory for virtual styling.",
    }


def _fit_type(product: Product) -> str:
    text = f"{product.name} {product.subcategory} {' '.join(product.aesthetic_tags)}".lower()
    if any(word in text for word in ["slim", "skinny", "fitted"]):
        return "slim"
    if any(word in text for word in ["relaxed", "loose", "oversized"]):
        return "relaxed"
    if product.category == "outerwear":
        return "regular"
    return "regular"


def _stretch(product: Product) -> str:
    text = f"{product.name} {product.subcategory} {product.description}".lower()
    if any(word in text for word in ["denim", "jeans", "leggings", "tights"]):
        return "some"
    if product.category in {"tops", "underwear"}:
        return "some"
    return "none"


def _pants_size_label(size: str) -> str:
    waist = int(_to_number(size, default=32))
    inseam = 30 if waist <= 30 else 32
    return f"{waist}x{inseam}"


def _belt_range(size: str) -> str:
    return {
        "S": "28-32",
        "M": "32-36",
        "L": "36-40",
    }.get(size, "32-38")


def _to_number(value: str, default: float) -> float:
    try:
        return float(value.split("x", 1)[0])
    except (TypeError, ValueError):
        return default


def _small_variance(product_id: str, size: str) -> float:
    digest = hashlib.sha256(f"{product_id}:{size}:measurements".encode("utf-8")).digest()
    return round(((digest[0] % 5) - 2) * 0.25, 2)
