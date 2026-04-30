from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


Category = Literal[
    "tops",
    "bottoms",
    "outerwear",
    "underwear",
    "shoes",
    "accessories",
]


class Product(BaseModel):
    id: str
    name: str
    brand: str
    category: Category
    subcategory: str
    gender_fit: str = "unisex"
    colors: list[str] = Field(default_factory=list)
    season_palette: list[str] = Field(default_factory=list)
    aesthetic_tags: list[str] = Field(default_factory=list)
    available_sizes: list[str] = Field(default_factory=list)
    material: str | None = None
    price: Decimal
    currency: str = "CAD"
    image_url: str | None = None
    try_on_ready_image_url: str | None = None
    product_url: str | None = None
    source: str = "demo"
    description: str = ""
    in_stock: bool = True


class ProductFilters(BaseModel):
    category: Category | None = None
    color_season: str | None = None
    aesthetic: str | None = None
    min_price: Decimal | None = None
    max_price: Decimal | None = None
    gender_fit: str | None = None
    search: str | None = None
    limit: int = Field(default=24, ge=1, le=100)


class ColorAnalysis(BaseModel):
    undertone: str
    color_season: str
    skin_tone_summary: str
    recommended_colors: list[str]
    avoid_colors: list[str]
    confidence: float = Field(ge=0, le=1)


class RecommendationReason(BaseModel):
    product_id: str
    score: int
    reasons: list[str]


class RecommendationResponse(BaseModel):
    products: list[Product]
    ranking: list[RecommendationReason]


class ColorSwatch(BaseModel):
    name: str
    hex: str
    rgb: list[int]


class ColorPalette(BaseModel):
    season: str
    best_colors: list[ColorSwatch] = Field(default_factory=list)
    neutral_colors: list[ColorSwatch] = Field(default_factory=list)
    accent_colors: list[ColorSwatch] = Field(default_factory=list)
    avoid_colors: list[ColorSwatch] = Field(default_factory=list)
    description: str = ""


class GeminiColorProfile(BaseModel):
    season: str
    description: str = ""
    undertone: str | None = None
    contrast: str | None = None
    metal: str | None = None
    best_colors: list[str] = Field(default_factory=list)
    neutral_colors: list[str] = Field(default_factory=list)
    avoid_colors: list[str] = Field(default_factory=list)
    best_hair_colors: list[str] = Field(default_factory=list)


class NormalizedColorProfile(BaseModel):
    season: str
    color_season: str
    description: str = ""
    undertone: str | None = None
    contrast: str | None = None
    metal: str | None = None
    best_colors: list[ColorSwatch] = Field(default_factory=list)
    neutral_colors: list[ColorSwatch] = Field(default_factory=list)
    avoid_colors: list[ColorSwatch] = Field(default_factory=list)
    best_hair_colors: list[ColorSwatch] = Field(default_factory=list)
    preferred_color_names: list[str] = Field(default_factory=list)
    avoid_color_names: list[str] = Field(default_factory=list)


class UserStyleProfile(BaseModel):
    top_size: str | None = None
    bottom_size: str | None = None
    shoe_size: str | None = None
    fit_preference: str | None = None
    style_vibes: list[str] = Field(default_factory=list)
    preferred_categories: list[Category] = Field(default_factory=list)
    avoid_categories: list[Category] = Field(default_factory=list)
    color_season: str | None = None
    preferred_colors: list[str] = Field(default_factory=list)
    avoid_colors: list[str] = Field(default_factory=list)


class OutfitRecommendationRequest(BaseModel):
    user_profile: UserStyleProfile = Field(default_factory=UserStyleProfile)
    occasion: str | None = None
    budget: Decimal | None = None
    max_items: int = Field(default=4, ge=1, le=6)


class ColorProfileOutfitRecommendationRequest(BaseModel):
    color_profile: GeminiColorProfile
    user_profile: UserStyleProfile = Field(default_factory=UserStyleProfile)
    occasion: str | None = None
    budget: Decimal | None = None
    max_items: int = Field(default=4, ge=1, le=6)


class RecommendedOutfitItem(BaseModel):
    product: Product
    selected_size: str | None = None
    score: int
    match_reasons: list[str] = Field(default_factory=list)


class OutfitRecommendationResponse(BaseModel):
    name: str
    occasion: str | None = None
    profile: UserStyleProfile
    palette: ColorPalette | None = None
    items: list[RecommendedOutfitItem]
    total_price: Decimal
    currency: str = "CAD"
    styling_summary: str
    notes: list[str] = Field(default_factory=list)


class OutfitBuildRequest(BaseModel):
    product_ids: list[str] = Field(default_factory=list)
    color_season: str | None = None
    aesthetic: str | None = None
    occasion: str | None = None
    budget: Decimal | None = None


class OutfitResponse(BaseModel):
    name: str
    occasion: str | None = None
    aesthetic: str | None = None
    color_season: str | None = None
    products: list[Product]
    total_price: Decimal
    currency: str = "CAD"
    notes: list[str] = Field(default_factory=list)


class CartItemInput(BaseModel):
    product_id: str
    quantity: int = Field(default=1, ge=1, le=10)
    selected_size: str | None = None


class CartSaveRequest(BaseModel):
    session_id: str = "demo-session"
    items: list[CartItemInput]


class CartItemResponse(BaseModel):
    product: Product
    quantity: int
    selected_size: str | None = None
    line_total: Decimal


class CartResponse(BaseModel):
    id: str
    session_id: str
    items: list[CartItemResponse]
    total_price: Decimal
    currency: str = "CAD"


class SavedOutfitRequest(BaseModel):
    session_id: str = "demo-session"
    name: str = "Saved Styleon Outfit"
    product_ids: list[str]
    occasion: str | None = None
    aesthetic: str | None = None
    color_season: str | None = None


class SavedOutfitResponse(BaseModel):
    id: str
    session_id: str
    name: str
    occasion: str | None = None
    aesthetic: str | None = None
    color_season: str | None = None
    products: list[Product]
    total_price: Decimal
    currency: str = "CAD"


class TrendCollection(BaseModel):
    id: str
    name: str
    aesthetic: str
    description: str
    season_palette: list[str]
    products: list[Product]


class TailorChatRequest(BaseModel):
    session_id: str = "demo-session"
    message: str
    color_season: str | None = None
    aesthetic: str | None = None
    budget: Decimal | None = None


class TailorChatResponse(BaseModel):
    response: str
    products: list[Product]


class TailorVoiceRequest(BaseModel):
    text: str


class TailorVoiceResponse(BaseModel):
    text: str
    audio_base64: str | None = None
    mime_type: str | None = None
    provider: str = "elevenlabs"


class TryOnRequest(BaseModel):
    user_image_url: str | None = None
    product_id: str


class GeminiPayloadRequest(BaseModel):
    product_ids: list[str]


class TryOnResponse(BaseModel):
    mode: Literal["side_by_side_preview"]
    user_image_url: str | None = None
    product: Product
    message: str
