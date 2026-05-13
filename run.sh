#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

LEAGUES="${LEAGUES:-E0 I1 SP1 F1 D1}"
SEASONS="${SEASONS:-2526 2425 2324}"
TRAIN_MODE="${TRAIN_MODE:-both}"

usage() {
  cat <<'EOF'
Usage: ./run.sh <command>

Commands:
  setup       Install Python dependencies with uv and create required folders
  acquire     Download historical CSV data into data/raw
  preprocess  Build processed CSV files into data/processed
  train       Train ML models into models
  pipeline    Run acquire + preprocess + train
  api         Run FastAPI locally on http://localhost:8000
  web         Run React web locally on http://localhost:5173
  docker      Start web + API + PostgreSQL with Docker Compose
  stop        Stop Docker Compose services

Environment overrides:
  LEAGUES="E0 I1 SP1 F1 D1"
  SEASONS="2526 2425 2324"
  TRAIN_MODE="both"
EOF
}

ensure_dirs() {
  mkdir -p data/raw data/processed models apps/api/app/db
}

setup() {
  ensure_dirs
  uv sync
}

acquire() {
  ensure_dirs
  uv run python scripts/data_acquisition.py \
    --leagues ${LEAGUES} \
    --seasons ${SEASONS} \
    --raw_data_output_dir data/raw
}

preprocess() {
  ensure_dirs
  uv run python scripts/data_preprocessing.py \
    --raw_data_input_dir data/raw \
    --processed_data_output_dir data/processed
}

train() {
  ensure_dirs
  uv run python scripts/train_models.py \
    --processed_data_input_dir data/processed \
    --trained_models_output_dir models \
    --train_mode "$TRAIN_MODE"
}

api() {
  cd apps/api
  uv run python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
}

web() {
  cd apps/web
  npm install
  npm run dev -- --host 0.0.0.0
}

case "${1:-}" in
  setup)
    setup
    ;;
  acquire)
    acquire
    ;;
  preprocess)
    preprocess
    ;;
  train)
    train
    ;;
  pipeline)
    setup
    acquire
    preprocess
    train
    ;;
  api)
    api
    ;;
  web)
    web
    ;;
  docker)
    ensure_dirs
    docker compose up --build
    ;;
  stop)
    docker compose down
    ;;
  -h|--help|help|"")
    usage
    ;;
  *)
    echo "Unknown command: $1" >&2
    echo >&2
    usage >&2
    exit 1
    ;;
esac
