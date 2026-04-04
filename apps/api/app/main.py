"""FastAPI entrypoint for mobile football prediction backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import admin, data_scientist, user
from .services.analytics_store import AnalyticsStore
from .services.data_repository import DataRepository
from .services.football_data_client import FootballDataClient
from .services.prediction_service import PredictionService

app = FastAPI(
    title="AI Football Predictions API",
    version="0.1.0",
    description="Role-based backend for mobile football prediction app.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _init_state() -> None:
    # Idempotent initialization so the app works in runtime and tests.
    if hasattr(app.state, "repository"):
        return

    repository = DataRepository()
    predictor = PredictionService(repository=repository)
    football_client = FootballDataClient(repository=repository)
    analytics = AnalyticsStore()

    app.state.repository = repository
    app.state.predictor = predictor
    app.state.football_client = football_client
    app.state.analytics = analytics


@app.on_event("startup")
def startup() -> None:
    _init_state()


_init_state()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(user.router, prefix="/api/v1")
app.include_router(data_scientist.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
