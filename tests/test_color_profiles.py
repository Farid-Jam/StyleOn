from decimal import Decimal

from app.models import (
    ColorProfileOutfitRecommendationRequest,
    GeminiColorProfile,
    UserStyleProfile,
)
from app.services.color_profiles import (
    normalize_color_profile,
    recommendation_request_from_color_profile,
)


def test_normalize_gemini_color_profile_maps_hex_to_swatches_and_season():
    normalized = normalize_color_profile(
        GeminiColorProfile(
            season="True Winter",
            description="Your skin tone #c4a882 shows cool, blue-based undertones.",
            undertone="Cool",
            contrast="High",
            metal="Silver",
            best_colors=["#1a1a2e", "#e8f4f8", "#c0392b", "#2980b9", "#8e44ad"],
            best_hair_colors=["#1c1c1c", "#2c1810", "#4a0e0e", "#f5f5f5"],
            avoid_colors=["#f4a460", "#daa520", "#cd853f"],
        )
    )

    assert normalized.color_season == "Cool Winter"
    assert normalized.undertone == "Cool"
    assert normalized.contrast == "High"
    assert normalized.metal == "Silver"
    assert normalized.best_colors[0].hex == "#1A1A2E"
    assert normalized.best_colors[0].rgb == [26, 26, 46]
    assert normalized.best_colors[0].name in normalized.preferred_color_names
    assert normalized.avoid_colors[0].name in normalized.avoid_color_names
    assert normalized.best_hair_colors


def test_color_profile_recommendation_request_merges_profile_preferences():
    request = recommendation_request_from_color_profile(
        ColorProfileOutfitRecommendationRequest(
            color_profile=GeminiColorProfile(
                season="True Winter",
                best_colors=["#1a1a2e"],
                neutral_colors=["#e8f4f8"],
                avoid_colors=["#f4a460"],
            ),
            user_profile=UserStyleProfile(
                top_size="M",
                style_vibes=["minimal"],
                preferred_colors=["black"],
            ),
            occasion="formal",
            budget=Decimal("200"),
        )
    )

    assert request.user_profile.color_season == "Cool Winter"
    assert request.user_profile.top_size == "M"
    assert request.user_profile.style_vibes == ["minimal"]
    assert "black" in request.user_profile.preferred_colors
    assert request.user_profile.avoid_colors
    assert request.occasion == "formal"
    assert request.budget == Decimal("200")
