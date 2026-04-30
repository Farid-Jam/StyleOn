# WearHouse

AI-powered personal stylist. Upload a selfie, get a color-season analysis from your skin, hair, and eye tones, then receive outfit recommendations from a curated product catalog — with a conversational tailor and voice replies.

## Features

- **Color analysis** — MediaPipe FaceLandmarker + KMeans extracts skin/hair/eye tones from a selfie; Gemini maps them to a seasonal color profile.
- **Outfit recommendations** — rank and assemble outfits from the catalog filtered by color season, aesthetic, and budget.
- **Tailor chat** — conversational styling assistant grounded in the live product list (Gemini).
- **Voice** — ElevenLabs synthesis for spoken tailor replies.
- **Try-on preview** — side-by-side composition of the user image and a chosen product.
- **Carts and saved outfits** — persist sessions and looks.

## Stack

- **Backend** — FastAPI (`app/`), Pydantic models, MediaPipe + OpenCV + scikit-learn for CV, `google-genai` for Gemini.
- **Inventory API** — Node/Express service (`server/`) backed by Snowflake.
- **Frontend** — Next.js 16 + React 19 + Tailwind v4 (`web/`).
- **Data** — Kaggle product set ingested into Snowflake via `scripts/`.

## Layout

```
app/            FastAPI app (main API surface)
  main.py        routes
  services/      gemini, inventory, recommendations, color profiles, elevenlabs
  models.py      Pydantic schemas
color_analysis.py  legacy standalone CV pipeline
gemini_layer.py    legacy Gemini wrapper
main.py            legacy single-file FastAPI entrypoint
server/         Node/Express + Snowflake inventory service
web/            Next.js frontend
scripts/        Snowflake schema, seeds, and Kaggle ingest
tests/          pytest suite
Dockerfile      packages app/ for deployment
```

## Running locally

### Backend (FastAPI)

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Health check: `GET http://localhost:8000/health`.

### Inventory server (Node + Snowflake)

```bash
cd server
npm install
cp .env.example .env   # fill in Snowflake credentials
npm run dev
```

Required env vars: `SNOWFLAKE_ACCOUNT`, `SNOWFLAKE_USER`, `SNOWFLAKE_PASSWORD`, `SNOWFLAKE_DATABASE`, `SNOWFLAKE_SCHEMA`, `SNOWFLAKE_WAREHOUSE`.

### Frontend (Next.js)

```bash
cd web
npm install
npm run dev
```

Open http://localhost:3000.

## Tests

```bash
pytest
```

## Docker

```bash
docker build -t wearhouse .
docker run -p 8000:8000 --env-file .env wearhouse
```

## Key endpoints

- `POST /analyze-color` — multipart selfie → color profile.
- `GET  /products` — filter by category, color season, aesthetic, price, gender fit.
- `GET  /recommendations` — ranked products for a profile.
- `POST /outfits/recommend` — full outfit suggestion.
- `POST /outfits/recommend-from-color-profile` — outfit from a Gemini color profile.
- `POST /tailor/chat` — conversational stylist grounded in inventory.
- `POST /tailor/voice` — ElevenLabs TTS reply.
- `POST /try-on` — side-by-side product preview.
- `POST /carts`, `GET /carts/{id}` — cart persistence.
- `POST /saved-outfits`, `GET /saved-outfits/{id}` — saved looks.
