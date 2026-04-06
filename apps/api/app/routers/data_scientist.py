"""Data scientist dashboard endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

from ..constants import COMPETITIONS, VALID_LEAGUES
from ..dependencies import require_role

router = APIRouter(prefix="/data-scientist", tags=["data-scientist"])

MODEL_TYPES = ["ensemble", "random_forest"]


def _compute_metrics(y_true, y_pred) -> dict[str, float]:
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
    }


@router.get("/dashboard")
def get_dashboard(request: Request, _role: str = Depends(require_role("data_scientist"))):
    items = []
    model_accuracy_buckets = {model_type: [] for model_type in MODEL_TYPES}

    for league in VALID_LEAGUES:
        df = request.app.state.repository.get_processed_df(league)
        y_true = df["Over2.5"].values
        numeric_columns = df.select_dtypes(include=["number"]).columns
        if "Over2.5" in numeric_columns:
            numeric_columns = numeric_columns.drop("Over2.5")
        x = df[numeric_columns].values

        per_model: dict[str, dict] = {}

        for model_type in MODEL_TYPES:
            model_payload = {
                "model_type": model_type,
                "accuracy": None,
                "precision": None,
                "recall": None,
                "f1": None,
                "model_status": "ok",
                "model_error": None,
            }

            try:
                model = request.app.state.predictor._load_model(league, model_type)  # pylint: disable=protected-access
                y_pred = model.predict(x)
                model_payload.update(_compute_metrics(y_true, y_pred))
                model_accuracy_buckets[model_type].append(model_payload["accuracy"])
            except Exception as exc:
                model_payload["model_status"] = "error"
                model_payload["model_error"] = str(exc)

            per_model[model_type] = model_payload

        items.append(
            {
                "league": league,
                "league_name": COMPETITIONS[league]["name"],
                "samples": int(len(df)),
                "models": per_model,
            }
        )

    model_summaries = []
    for model_type in MODEL_TYPES:
        accuracies = model_accuracy_buckets[model_type]
        model_summaries.append(
            {
                "model_type": model_type,
                "average_accuracy": round(sum(accuracies) / len(accuracies), 4) if accuracies else None,
                "leagues_ok": len(accuracies),
                "leagues_error": len(VALID_LEAGUES) - len(accuracies),
            }
        )

    # Backward-compatible value used by earlier UI.
    ensemble_summary = next((item for item in model_summaries if item["model_type"] == "ensemble"), None)
    average_accuracy = ensemble_summary["average_accuracy"] if ensemble_summary else None

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "note": "Metrics are evaluated on available historical processed data.",
        "average_accuracy": average_accuracy,
        "model_summaries": model_summaries,
        "items": items,
    }


@router.get("/feature-importance")
def get_feature_importance(
    request: Request,
    league: str = Query(default="E0"),
    model_type: str = Query(default="random_forest"),
    top_n: int = Query(default=12, ge=5, le=30),
    _role: str = Depends(require_role("data_scientist")),
):
    if league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail=f"Unsupported league '{league}'.")

    try:
        items = request.app.state.predictor.get_feature_importance(
            league=league,
            model_type=model_type,
            top_n=top_n,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "league": league,
        "model_type": "random_forest",
        "items": items,
    }
