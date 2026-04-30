# Styleon Backend

FastAPI backend for Styleon, an AI fashion store that uses Snowflake as the inventory and recommendation source of truth.

## What Is Implemented

- Product inventory API with Snowflake support and mock demo fallback.
- Color analysis endpoint wired for Gemini Vision.
- Recommendations based on color season, aesthetic tags, and budget.
- Outfit builder with total outfit pricing.
- Profile-aware outfit recommendations with sizes, fit, vibe, color palette, and match reasons.
- Trend collections.
- AI tailor chat that retrieves inventory context before calling Gemini.
- ElevenLabs text-to-speech endpoint.
- V1 try-on fallback as a side-by-side product preview.
- Snowflake schema and demo seed SQL.

## Quick Start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`.

By default, the app runs with `STYLEON_DATA_MODE=mock`, so it works without Snowflake, Gemini, or ElevenLabs credentials. Set `STYLEON_MOCK_INVENTORY_PATH=app/data/kaggle_inventory.json` to use the generated Kaggle inventory locally.

## Snowflake Setup

1. Create a Snowflake trial/account and warehouse.
2. Run `scripts/schema.sql` in Snowsight.
3. Run `scripts/seed_demo.sql` for starter inventory.
4. Set these values in `.env`:

```bash
STYLEON_DATA_MODE=snowflake
SNOWFLAKE_ACCOUNT=your-org-your-account
SNOWFLAKE_USER=your-user
SNOWFLAKE_PASSWORD=your-password
SNOWFLAKE_ROLE=your-role
SNOWFLAKE_WAREHOUSE=your-warehouse
SNOWFLAKE_DATABASE=STYLEON
SNOWFLAKE_SCHEMA=PUBLIC
```

Images should stay outside Snowflake. Store public image URLs in `PRODUCTS.image_url`.

## API Flow

1. `POST /analyze-color` with a user photo.
2. `GET /recommendations?color_season=Warm%20Autumn&aesthetic=minimal&budget=120`.
3. `POST /outfits/build` to build and price a full outfit.
4. `POST /outfits/recommend` to build a personalized outfit from size, fit, vibe, season, and color preferences.
5. `POST /tailor/chat` to answer styling questions using retrieved inventory.
6. `POST /tailor/voice` to turn the tailor response into ElevenLabs audio.
7. `POST /try-on` for the v1 side-by-side preview.

Example personalized outfit request:

```json
{
  "user_profile": {
    "top_size": "M",
    "bottom_size": "32x32",
    "shoe_size": "10",
    "fit_preference": "regular",
    "style_vibes": ["minimal", "streetwear"],
    "preferred_categories": ["tops", "bottoms", "shoes", "outerwear"],
    "color_season": "Warm Autumn",
    "preferred_colors": ["olive", "camel", "brown"],
    "avoid_colors": ["neon pink"]
  },
  "occasion": "casual dinner",
  "budget": 250,
  "max_items": 4
}
```

The response includes selected products, selected sizes, a color palette, a styling summary, and match reasons for every item. Palette colors are returned as swatches so the frontend can render them directly:

```json
{
  "name": "olive",
  "hex": "#708238",
  "rgb": [112, 130, 56]
}
```

## Data Sources

Recommended hackathon seed sources:

- Kaggle Fashion Product Images Small for product images and categories.
- Myntra Fashion Products when price fields are needed immediately.
- ShopStyle or Rakuten Product Search API later for live prices and retailer links.

For hackathon safety, seed 50-150 curated products first and enrich missing prices manually or synthetically.

## Kaggle Fashion Dataset Ingestion

Download and unzip the Kaggle dataset so it has this shape:

```text
kaggle-fashion/
  styles.csv
  images/
    15970.jpg
```

Generate a curated Styleon subset:

```bash
python scripts/ingest_kaggle.py \
  --input-dir /path/to/kaggle-fashion \
  --limit 1000 \
  --copy-images \
  --output-json app/data/kaggle_inventory.json \
  --output-csv data/kaggle_products.csv
```

The script maps Kaggle fields into Styleon products, generates deterministic demo prices, derives color-analysis palettes from `baseColour`, adds aesthetic tags from `usage`, and copies selected images into `app/static/product-images`.

For local frontend demos, image URLs will look like:

```text
/static/product-images/15970.jpg
```

To use the generated JSON as mock data during development, set this in `.env`:

```bash
STYLEON_DATA_MODE=mock
STYLEON_MOCK_INVENTORY_PATH=app/data/kaggle_inventory.json
```

For Snowflake:

1. Run `scripts/schema.sql`.
2. Generate `data/kaggle_products.csv`.
3. Upload it to the Snowflake stage and run `scripts/load_kaggle_products.sql`.
4. Set `STYLEON_DATA_MODE=snowflake`.

Or use the helper script after setting Snowflake values in `.env`:

```bash
python scripts/upload_kaggle_to_snowflake.py --csv-path data/kaggle_products.csv
```

The Kaggle dataset does not include real prices. Styleon marks generated prices in the product description as estimated demo prices.

## Tests

```bash
pytest
```
