import base64

from app.config import Settings


async def synthesize_voice(text: str, settings: Settings) -> tuple[str | None, str | None]:
    if not settings.elevenlabs_api_key or not settings.elevenlabs_voice_id:
        return None, None

    import httpx

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.elevenlabs_voice_id}"
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8},
    }
    headers = {
        "xi-api-key": settings.elevenlabs_api_key,
        "accept": "audio/mpeg",
        "content-type": "application/json",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, json=payload, headers=headers)
        response.raise_for_status()
    return base64.b64encode(response.content).decode("utf-8"), "audio/mpeg"
