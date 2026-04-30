import base64
import json

from app.config import Settings
from app.models import ColorAnalysis, Product


FALLBACK_ANALYSIS = ColorAnalysis(
    undertone="warm",
    color_season="Warm Autumn",
    skin_tone_summary="Demo fallback: warm-neutral coloring with medium contrast.",
    recommended_colors=["olive", "camel", "cream", "rust", "gold"],
    avoid_colors=["icy blue", "stark black", "neon pink"],
    confidence=0.62,
)


async def analyze_color_with_gemini(image_bytes: bytes, mime_type: str, settings: Settings) -> ColorAnalysis:
    if not settings.gemini_api_key:
        return FALLBACK_ANALYSIS

    import httpx

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")
    prompt = """
Analyze this user's visible coloring for fashion styling. Return strict JSON with:
undertone, color_season, skin_tone_summary, recommended_colors, avoid_colors, confidence.
Do not identify the person. Do not infer sensitive identity traits.
"""
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime_type, "data": image_b64}},
                ]
            }
        ],
        "generationConfig": {"response_mime_type": "application/json"},
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    )
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
    text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    return ColorAnalysis.model_validate(json.loads(text))


async def tailor_chat_with_gemini(message: str, products: list[Product], settings: Settings) -> str:
    context = "\n".join(
        f"- {product.name}: {product.category}, {', '.join(product.colors)}, "
        f"{product.currency} {product.price}, tags={', '.join(product.aesthetic_tags)}"
        for product in products
    )
    if not settings.gemini_api_key:
        if products:
            first = products[0]
            return (
                f"I'd start with {first.name}. It fits your request, costs {first.currency} {first.price}, "
                "and pairs well with the other retrieved Styleon pieces."
            )
        return "I could not find an exact inventory match yet, so I would loosen the color or budget filter."

    import httpx

    prompt = f"""
You are Styleon's AI tailor. Answer warmly and practically.
Only recommend items from this Snowflake inventory context:
{context}

User question: {message}
"""
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent?key={settings.gemini_api_key}"
    )
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
    return response.json()["candidates"][0]["content"]["parts"][0]["text"]
