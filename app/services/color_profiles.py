from __future__ import annotations

from app.models import (
    ColorProfileOutfitRecommendationRequest,
    ColorSwatch,
    GeminiColorProfile,
    NormalizedColorProfile,
    OutfitRecommendationRequest,
    UserStyleProfile,
)
from app.services.inventory import _COLOR_HEX


SEASON_ALIASES = {
    "autumn": "Warm Autumn",
    "deep autumn": "Warm Autumn",
    "dark autumn": "Warm Autumn",
    "true autumn": "Warm Autumn",
    "warm autumn": "Warm Autumn",
    "soft autumn": "Soft Autumn",
    "winter": "Cool Winter",
    "true winter": "Cool Winter",
    "cool winter": "Cool Winter",
    "deep winter": "Deep Winter",
    "dark winter": "Deep Winter",
    "summer": "Soft Summer",
    "soft summer": "Soft Summer",
    "cool summer": "Soft Summer",
    "spring": "Warm Spring",
    "warm spring": "Warm Spring",
    "true spring": "Warm Spring",
}


def normalize_color_profile(profile: GeminiColorProfile) -> NormalizedColorProfile:
    best_colors = [_to_swatch(value) for value in profile.best_colors]
    neutral_colors = [_to_swatch(value) for value in profile.neutral_colors]
    avoid_colors = [_to_swatch(value) for value in profile.avoid_colors]
    best_hair_colors = [_to_swatch(value) for value in profile.best_hair_colors]
    return NormalizedColorProfile(
        season=profile.season,
        color_season=normalize_season(profile.season),
        description=profile.description,
        undertone=profile.undertone,
        contrast=profile.contrast,
        metal=profile.metal,
        best_colors=best_colors,
        neutral_colors=neutral_colors,
        avoid_colors=avoid_colors,
        best_hair_colors=best_hair_colors,
        preferred_color_names=_unique_names(best_colors + neutral_colors),
        avoid_color_names=_unique_names(avoid_colors),
    )


def recommendation_request_from_color_profile(
    request: ColorProfileOutfitRecommendationRequest,
) -> OutfitRecommendationRequest:
    normalized = normalize_color_profile(request.color_profile)
    profile = request.user_profile.model_copy(deep=True)
    profile.color_season = profile.color_season or normalized.color_season
    profile.preferred_colors = _merge_unique(
        profile.preferred_colors,
        normalized.preferred_color_names,
    )
    profile.avoid_colors = _merge_unique(profile.avoid_colors, normalized.avoid_color_names)
    return OutfitRecommendationRequest(
        user_profile=profile,
        occasion=request.occasion,
        budget=request.budget,
        max_items=request.max_items,
    )


def normalize_season(season: str) -> str:
    return SEASON_ALIASES.get(season.strip().lower(), season)


def _to_swatch(value: str) -> ColorSwatch:
    value = value.strip()
    if _is_hex(value):
        normalized_hex = _normalize_hex(value)
        name = _nearest_color_name(normalized_hex)
        return ColorSwatch(name=name, hex=normalized_hex, rgb=_hex_to_rgb(normalized_hex))
    name = value.lower().replace("_", " ")
    hex_value = _COLOR_HEX.get(name, "#808080")
    return ColorSwatch(name=name, hex=hex_value, rgb=_hex_to_rgb(hex_value))


def _nearest_color_name(hex_value: str) -> str:
    target = _hex_to_rgb(hex_value)
    best_name = "custom color"
    best_distance = float("inf")
    for name, known_hex in _COLOR_HEX.items():
        distance = sum((target[index] - _hex_to_rgb(known_hex)[index]) ** 2 for index in range(3))
        if distance < best_distance:
            best_name = name
            best_distance = distance
    return best_name


def _is_hex(value: str) -> bool:
    cleaned = value.removeprefix("#")
    return len(cleaned) == 6 and all(character in "0123456789abcdefABCDEF" for character in cleaned)


def _normalize_hex(value: str) -> str:
    return "#" + value.removeprefix("#").upper()


def _hex_to_rgb(hex_value: str) -> list[int]:
    cleaned = hex_value.removeprefix("#")
    return [int(cleaned[index : index + 2], 16) for index in (0, 2, 4)]


def _unique_names(swatches: list[ColorSwatch]) -> list[str]:
    return _merge_unique([], [swatch.name for swatch in swatches])


def _merge_unique(existing: list[str], additions: list[str]) -> list[str]:
    merged: list[str] = []
    for value in existing + additions:
        normalized = value.strip().lower().replace("_", " ")
        if normalized and normalized not in merged:
            merged.append(normalized)
    return merged
