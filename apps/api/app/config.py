"""Runtime configuration for FastAPI app."""

from pathlib import Path
import os

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT_DIR / "data"
MODELS_DIR = ROOT_DIR / "models"
PROCESSED_DIR = DATA_DIR / "processed"
RAW_DIR = DATA_DIR / "raw"
NEXT_MATCHES_FILE = DATA_DIR / "next_matches.json"
ANALYTICS_DB = Path(__file__).resolve().parents[1] / "db" / "analytics.db"

# Load env from project root (.env) then fallback to user home (~/.env).
load_dotenv(dotenv_path=ROOT_DIR / ".env")
load_dotenv(dotenv_path=Path.home() / ".env")

API_FOOTBALL_DATA = os.getenv("API_FOOTBALL_DATA", "")

ALLOWED_ROLES = {"user", "data_scientist", "admin"}
