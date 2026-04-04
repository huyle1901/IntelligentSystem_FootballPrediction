"""Data scientist dashboard endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

from ..constants import COMPETITIONS, VALID_LEAGUES
from ..dependencies import require_role

router = APIRouter(prefix="/data-scientist", tags=["data-scientist"])


@router.get("/dashboard")
def get_dashboard(request: Request, _role: str = Depends(require_role("data_scientist"))):
    items = []

    for league in VALID_LEAGUES:
        df = request.app.state.repository.get_processed_df(league)
        league_payload = {
            "league": league,
            "league_name": COMPETITIONS[league]["name"],
            "samples": int(len(df)),
            "accuracy": None,
            "precision": None,
            "recall": None,
            "f1": None,
            "model_status": "ok",
            "model_error": None,
        }

        try:
            model = request.app.state.predictor._load_model(league)  # pylint: disable=protected-access
            y_true = df["Over2.5"].values
            numeric_columns = df.select_dtypes(include=["number"]).columns
            if "Over2.5" in numeric_columns:
                numeric_columns = numeric_columns.drop("Over2.5")
            x = df[numeric_columns].values

            y_pred = model.predict(x)
            league_payload["accuracy"] = round(float(accuracy_score(y_true, y_pred)), 4)
            league_payload["precision"] = round(float(precision_score(y_true, y_pred, zero_division=0)), 4)
            league_payload["recall"] = round(float(recall_score(y_true, y_pred, zero_division=0)), 4)
            league_payload["f1"] = round(float(f1_score(y_true, y_pred, zero_division=0)), 4)
        except Exception as exc:
            league_payload["model_status"] = "error"
            league_payload["model_error"] = str(exc)

        items.append(league_payload)

    valid_accuracies = [item["accuracy"] for item in items if item["accuracy"] is not None]
    avg_accuracy = round(sum(valid_accuracies) / len(valid_accuracies), 4) if valid_accuracies else None

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "note": "Metrics are evaluated on available historical processed data.",
        "average_accuracy": avg_accuracy,
        "items": items,
    }
