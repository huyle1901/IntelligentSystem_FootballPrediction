# AI Football Prediction System

Web-based machine learning application for predicting football match Over/Under 2.5 goals. The system includes a FastAPI backend, a React/Vite web frontend, PostgreSQL support for Docker, and offline scripts for data acquisition, preprocessing, and model training.

## Tech Stack

| Layer | Technology |
|---|---|
| Web | React, Vite, Recharts |
| API | FastAPI, Uvicorn |
| ML/Data | pandas, NumPy, scikit-learn, XGBoost, mRMR |
| Local DB | SQLite fallback |
| Docker DB | PostgreSQL |
| Python env | uv, Python 3.10 |

## Project Structure

```text
apps/
  api/                 FastAPI backend
  web/                 React web app
scripts/               Data and ML pipeline scripts
data/
  raw/                 Downloaded historical CSV files
  processed/           Preprocessed training CSV files
  next_matches.json    Upcoming matches used by the web app
models/                Trained .pkl models
docker-compose.yml     Web + API + PostgreSQL stack
run.sh                 Helper script for setup, pipeline, and services
```

## Environment

Create a local `.env` from the example:

```bash
cp .env.example .env
```

Important variables:

```bash
API_FOOTBALL_DATA=
DATABASE_URL=
```

Notes:

- `API_FOOTBALL_DATA` is used for football-data.org features such as upcoming matches and player data.
- Historical CSV acquisition uses football-data.co.uk and does not require an API key.
- `.env` is ignored by git and should not be committed.

## Quick Start with uv

Install dependencies:

```bash
uv sync
```

Run the full pipeline from scratch:

```bash
./run.sh pipeline
```

This runs:

```text
data acquisition -> preprocessing -> model training
```

Expected generated files:

```text
data/raw/E0_merged.csv
data/processed/E0_merged_preprocessed.csv
models/E0_voting_classifier.pkl
models/E0_random_forest.pkl
```

The same pattern is generated for `I1`, `SP1`, `F1`, and `D1`.

## Pipeline Commands

Run each step manually:

```bash
./run.sh acquire
./run.sh preprocess
./run.sh train
```

Or run the underlying commands directly:

```bash
uv run python scripts/data_acquisition.py \
  --leagues E0 I1 SP1 F1 D1 \
  --seasons 2526 2425 2324 \
  --raw_data_output_dir data/raw

uv run python scripts/data_preprocessing.py \
  --raw_data_input_dir data/raw \
  --processed_data_output_dir data/processed

uv run python scripts/train_models.py \
  --processed_data_input_dir data/processed \
  --trained_models_output_dir models \
  --train_mode both
```

Training all models can take a while. You only need to retrain when the raw data, features, or model logic changes.

## Run with Docker

Start the full web stack:

```bash
./run.sh docker
```

or:

```bash
docker compose up --build
```

Services:

| Component | URL |
|---|---|
| Web App | http://localhost:5173 |
| API Docs | http://localhost:8000/docs |
| API Health | http://localhost:8000/health |
| PostgreSQL | localhost:5432 |

Docker Compose uses PostgreSQL:

```bash
DATABASE_URL=postgresql://football:football@postgres:5432/football_ai
```

The API container reads local generated artifacts through mounted folders:

```text
./data   -> /app/data
./models -> /app/models
```

Stop Docker services:

```bash
./run.sh stop
```

## Run Locally without Docker

Terminal 1, run API:

```bash
./run.sh api
```

Terminal 2, run web:

```bash
./run.sh web
```

Open:

```text
http://localhost:5173
```

## GitHub and Generated Files

The repository is intended to store source code, configuration, and documentation. Large/generated artifacts are ignored:

```text
data/*/*.csv
models/*
apps/api/app/db/*.db
```

After cloning from GitHub, run the pipeline once to regenerate data and models:

```bash
uv sync
./run.sh pipeline
```

If you already have generated CSV/model files from another machine, copy them into `data/raw`, `data/processed`, and `models` instead of rerunning the full pipeline.

## API Notes

Main route groups:

```text
/api/v1/user/...
/api/v1/data-scientist/...
/api/v1/admin/...
/health
```

Auth and analytics storage:

- Local run without `DATABASE_URL`: SQLite at `apps/api/app/db/analytics.db`
- Docker Compose: PostgreSQL service `postgres`

Football data and ML models remain file-based in `data/` and `models/`.

## Troubleshooting

If `python` is not found, use `uv run python ...` or `./run.sh ...`.

If data acquisition fails with `Connection reset by peer`, the network is blocking or resetting `football-data.co.uk`. Try another network/VPN or manually download the CSV files and place them in `data/raw`.

## License

See `LICENSE` for details.
