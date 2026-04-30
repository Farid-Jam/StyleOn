# WearHouse

<div align="center">
  <a href="https://devpost.com/software/WearHouse">
    <img src="WearHouse.png" alt="WearHouse" width="800">
  </a>
  <p><i>Click the image to view the project on Devpost</i></p>

[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Pydantic](https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white)](https://docs.pydantic.dev/)
[![Uvicorn](https://img.shields.io/badge/Uvicorn-20232A?style=for-the-badge&logo=gunicorn&logoColor=white)](https://www.uvicorn.org/)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Snowflake](https://img.shields.io/badge/Snowflake-29B5E8?style=for-the-badge&logo=snowflake&logoColor=white)](https://www.snowflake.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-000000?style=for-the-badge&logo=elevenlabs&logoColor=white)](https://elevenlabs.io/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0097A7?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/mediapipe)
[![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![NumPy](https://img.shields.io/badge/NumPy-013243?style=for-the-badge&logo=numpy&logoColor=white)](https://numpy.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![pytest](https://img.shields.io/badge/pytest-0A9EDC?style=for-the-badge&logo=pytest&logoColor=white)](https://docs.pytest.org/)
</div>

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
