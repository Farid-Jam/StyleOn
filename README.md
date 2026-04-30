# WearHouse

<div align="center">
  <a href="https://devpost.com/software/WearHouse">
    <img src="WearHouse.png" alt="WearHouse" width="800">
  </a>
  <p><i>Click the logo to view the project on Devpost</i></p>

  [![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
  [![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)](https://reactrouter.com/)
  [![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![CSS Modules](https://img.shields.io/badge/CSS_Modules-000000?style=for-the-badge&logo=css-modules&logoColor=white)](https://github.com/css-modules/css-modules)
  [![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
  [![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
  [![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-D71F00?style=for-the-badge&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
  [![Uvicorn](https://img.shields.io/badge/Uvicorn-20232A?style=for-the-badge&logo=gunicorn&logoColor=white)](https://www.uvicorn.org/)
    [![Google Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
  [![OpenAI Whisper](https://img.shields.io/badge/OpenAI_Whisper-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/research/whisper)
  [![Auth0](https://img.shields.io/badge/Auth0-EB5424?style=for-the-badge&logo=auth0&logoColor=white)](https://auth0.com/)
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
