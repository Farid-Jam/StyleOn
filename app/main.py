from decimal import Decimal
from pathlib import Path

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.staticfiles import StaticFiles

from app.config import Settings, get_settings
from app.models import (
    CartResponse,
    CartSaveRequest,
    ColorAnalysis,
    ColorProfileOutfitRecommendationRequest,
    GeminiPayloadRequest,
    GeminiColorProfile,
    NormalizedColorProfile,
    OutfitBuildRequest,
    OutfitRecommendationRequest,
    OutfitRecommendationResponse,
    OutfitResponse,
    Product,
    ProductFilters,
    RecommendationResponse,
    SavedOutfitRequest,
    SavedOutfitResponse,
    TailorChatRequest,
    TailorChatResponse,
    TailorVoiceRequest,
    TailorVoiceResponse,
    TrendCollection,
    TryOnRequest,
    TryOnResponse,
)
from app.services.elevenlabs import synthesize_voice
from app.services.color_profiles import normalize_color_profile, recommendation_request_from_color_profile
from app.services.gemini import analyze_color_with_gemini, tailor_chat_with_gemini
from app.services.gemini_payload import product_to_gemini_payload, products_to_gemini_payload
from app.services.inventory import InventoryRepository, get_inventory_repository
from app.services.recommendations import build_outfit, rank_products, recommend_outfit


app = FastAPI(title="Styleon Backend", version="0.1.0")
STATIC_DIR = Path(__file__).resolve().parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def inventory(settings: Settings = Depends(get_settings)) -> InventoryRepository:
    return get_inventory_repository(settings)


@app.get("/health")
def health(settings: Settings = Depends(get_settings)) -> dict[str, str]:
    return {"status": "ok", "app": settings.app_name, "data_mode": settings.styleon_data_mode}


@app.post("/analyze-color", response_model=ColorAnalysis)
async def analyze_color(
    image: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
) -> ColorAnalysis:
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty.")
    return await analyze_color_with_gemini(image_bytes, image.content_type or "image/jpeg", settings)


@app.get("/products", response_model=list[Product])
def products(
    category: str | None = None,
    color_season: str | None = None,
    aesthetic: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    gender_fit: str | None = None,
    search: str | None = None,
    limit: int = Query(default=24, ge=1, le=100),
    repo: InventoryRepository = Depends(inventory),
) -> list[Product]:
    filters = ProductFilters(
        category=category,
        color_season=color_season,
        aesthetic=aesthetic,
        min_price=min_price,
        max_price=max_price,
        gender_fit=gender_fit,
        search=search,
        limit=limit,
    )
    return repo.list_products(filters)


@app.get("/products/{product_id}/gemini-payload")
def product_gemini_payload(
    product_id: str,
    repo: InventoryRepository = Depends(inventory),
) -> dict[str, object]:
    products_by_id = repo.get_products_by_ids([product_id])
    if not products_by_id:
        raise HTTPException(status_code=404, detail="Product not found.")
    return product_to_gemini_payload(products_by_id[0])


@app.get("/recommendations", response_model=RecommendationResponse)
def recommendations(
    color_season: str | None = None,
    aesthetic: str | None = None,
    budget: Decimal | None = None,
    category: str | None = None,
    repo: InventoryRepository = Depends(inventory),
) -> RecommendationResponse:
    products_to_rank = repo.list_products(
        ProductFilters(
            category=category,
            color_season=color_season,
            aesthetic=aesthetic,
            max_price=budget,
            limit=100,
        )
    )
    ranked_products, ranking = rank_products(products_to_rank, color_season, aesthetic, budget)
    return RecommendationResponse(products=ranked_products[:24], ranking=ranking[:24])


@app.post("/color-profile/normalize", response_model=NormalizedColorProfile)
def color_profile_normalize(request: GeminiColorProfile) -> NormalizedColorProfile:
    return normalize_color_profile(request)


@app.post("/outfits/build", response_model=OutfitResponse)
def outfits_build(
    request: OutfitBuildRequest,
    repo: InventoryRepository = Depends(inventory),
) -> OutfitResponse:
    if request.product_ids:
        products_for_outfit = repo.get_products_by_ids(request.product_ids)
    else:
        products_for_outfit = repo.list_products(
            ProductFilters(
                color_season=request.color_season,
                aesthetic=request.aesthetic,
                max_price=request.budget,
                limit=100,
            )
        )
    return build_outfit(request, products_for_outfit)


@app.post("/outfits/recommend", response_model=OutfitRecommendationResponse)
def outfits_recommend(
    request: OutfitRecommendationRequest,
    repo: InventoryRepository = Depends(inventory),
) -> OutfitRecommendationResponse:
    color_season = request.user_profile.color_season
    products_for_outfit = repo.list_products(
        ProductFilters(
            max_price=request.budget,
            limit=100,
        )
    )
    palette = repo.get_color_palette(color_season) if color_season else None
    return recommend_outfit(request, products_for_outfit, palette)


@app.post("/outfits/recommend-from-color-profile", response_model=OutfitRecommendationResponse)
def outfits_recommend_from_color_profile(
    request: ColorProfileOutfitRecommendationRequest,
    repo: InventoryRepository = Depends(inventory),
) -> OutfitRecommendationResponse:
    recommendation_request = recommendation_request_from_color_profile(request)
    color_season = recommendation_request.user_profile.color_season
    products_for_outfit = repo.list_products(
        ProductFilters(
            max_price=request.budget,
            limit=100,
        )
    )
    palette = repo.get_color_palette(color_season) if color_season else None
    return recommend_outfit(recommendation_request, products_for_outfit, palette)


@app.get("/trends", response_model=list[TrendCollection])
def trends(repo: InventoryRepository = Depends(inventory)) -> list[TrendCollection]:
    return repo.list_trends()


@app.post("/carts", response_model=CartResponse)
def save_cart(
    request: CartSaveRequest,
    repo: InventoryRepository = Depends(inventory),
) -> CartResponse:
    _ensure_products_exist([item.product_id for item in request.items], repo)
    return repo.save_cart(request.session_id, request.items)


@app.get("/carts/{cart_id}", response_model=CartResponse)
def get_cart(
    cart_id: str,
    repo: InventoryRepository = Depends(inventory),
) -> CartResponse:
    cart = repo.get_cart(cart_id)
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found.")
    return cart


@app.post("/saved-outfits", response_model=SavedOutfitResponse)
def save_outfit(
    request: SavedOutfitRequest,
    repo: InventoryRepository = Depends(inventory),
) -> SavedOutfitResponse:
    _ensure_products_exist(request.product_ids, repo)
    return repo.save_outfit(request)


@app.get("/saved-outfits/{outfit_id}", response_model=SavedOutfitResponse)
def get_saved_outfit(
    outfit_id: str,
    repo: InventoryRepository = Depends(inventory),
) -> SavedOutfitResponse:
    outfit = repo.get_outfit(outfit_id)
    if not outfit:
        raise HTTPException(status_code=404, detail="Saved outfit not found.")
    return outfit


@app.post("/tailor/chat", response_model=TailorChatResponse)
async def tailor_chat(
    request: TailorChatRequest,
    repo: InventoryRepository = Depends(inventory),
    settings: Settings = Depends(get_settings),
) -> TailorChatResponse:
    products_for_context = repo.list_products(
        ProductFilters(
            color_season=request.color_season,
            aesthetic=request.aesthetic,
            max_price=request.budget,
            search=request.message,
            limit=8,
        )
    )
    if not products_for_context:
        products_for_context = repo.list_products(
            ProductFilters(
                color_season=request.color_season,
                aesthetic=request.aesthetic,
                max_price=request.budget,
                limit=8,
            )
        )
    response = await tailor_chat_with_gemini(request.message, products_for_context, settings)
    return TailorChatResponse(response=response, products=products_for_context)


@app.post("/tailor/voice", response_model=TailorVoiceResponse)
async def tailor_voice(
    request: TailorVoiceRequest,
    settings: Settings = Depends(get_settings),
) -> TailorVoiceResponse:
    audio_base64, mime_type = await synthesize_voice(request.text, settings)
    return TailorVoiceResponse(text=request.text, audio_base64=audio_base64, mime_type=mime_type)


@app.post("/try-on", response_model=TryOnResponse)
def try_on(
    request: TryOnRequest,
    repo: InventoryRepository = Depends(inventory),
) -> TryOnResponse:
    products_by_id = repo.get_products_by_ids([request.product_id])
    if not products_by_id:
        raise HTTPException(status_code=404, detail="Product not found.")
    return TryOnResponse(
        mode="side_by_side_preview",
        user_image_url=request.user_image_url,
        product=products_by_id[0],
        message="V1 preview returns your image beside the selected product; advanced garment warping can be added later.",
    )


@app.post("/try-on/gemini-payload")
def try_on_gemini_payload(
    request: GeminiPayloadRequest,
    repo: InventoryRepository = Depends(inventory),
) -> dict[str, object]:
    _ensure_products_exist(request.product_ids, repo)
    products = repo.get_products_by_ids(request.product_ids)
    products_by_id = {product.id: product for product in products}
    ordered_products = [products_by_id[product_id] for product_id in request.product_ids if product_id in products_by_id]
    return products_to_gemini_payload(ordered_products)


def _ensure_products_exist(product_ids: list[str], repo: InventoryRepository) -> None:
    products = repo.get_products_by_ids(product_ids)
    found_ids = {product.id for product in products}
    missing_ids = [product_id for product_id in product_ids if product_id not in found_ids]
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Unknown product ids: {', '.join(missing_ids)}")
