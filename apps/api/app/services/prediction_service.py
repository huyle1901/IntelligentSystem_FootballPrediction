"""Prediction service that reuses trained models in /models."""

from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any

import pandas as pd

from ..config import MODELS_DIR
from ..constants import VALID_LEAGUES
from .data_repository import DataRepository


HOME_TEAM_FEATURES = [
    "HomeTeam", "FTHG", "HG", "HTHG", "HS", "HST", "HHW", "HC", "HF", "HFKC", "HO", "HY", "HR", "HBP",
    "B365H", "BFH", "BSH", "BWH", "GBH", "IWH", "LBH", "PSH", "SOH", "SBH", "SJH", "SYH", "VCH", "WHH",
    "BbMxH", "BbAvH", "MaxH", "AvgH", "BFEH", "BbMxAHH", "BbAvAHH", "GBAHH", "LBAHH", "B365AHH", "PAHH",
    "MaxAHH", "AvgAHH", "BbAHh", "AHh", "GBAH", "LBAH", "B365AH", "AvgHomeGoalsScored", "AvgHomeGoalsConceded",
    "HomeOver2.5Perc", "AvgLast5HomeGoalsScored", "AvgLast5HomeGoalsConceded", "Last5HomeOver2.5Count", "Last5HomeOver2.5Perc",
]

AWAY_TEAM_FEATURES = [
    "AwayTeam", "FTAG", "AG", "HTAG", "AS", "AST", "AHW", "AC", "AF", "AFKC", "AO", "AY", "AR", "ABP",
    "B365A", "BFA", "BSA", "BWA", "GBA", "IWA", "LBA", "PSA", "SOA", "SBA", "SJA", "SYA", "VCA", "WHA",
    "BbMxA", "BbAvA", "MaxA", "AvgA", "BFEA", "BbMxAHA", "BbAvAHA", "GBAHA", "LBAHA", "B365AHA", "PAHA",
    "MaxAHA", "AvgAHA", "AvgAwayGoalsScored", "AvgAwayGoalsConceded", "AwayOver2.5Perc", "AvgLast5AwayGoalsScored",
    "AvgLast5AwayGoalsConceded", "Last5AwayOver2.5Count", "Last5AwayOver2.5Perc",
]


class PredictionService:
    def __init__(self, repository: DataRepository) -> None:
        self.repository = repository
        self._model_cache: dict[str, Any] = {}
        self._model_load_errors: dict[str, str] = {}

    @staticmethod
    def _normalize_model_type(model_type: str) -> str:
        normalized = (model_type or "ensemble").strip().lower()
        aliases = {
            "ensemble": "ensemble",
            "voting": "ensemble",
            "voting_classifier": "ensemble",
            "random_forest": "random_forest",
            "rf": "random_forest",
        }
        if normalized not in aliases:
            raise ValueError(f"Unsupported model_type '{model_type}'.")
        return aliases[normalized]

    @staticmethod
    def get_supported_model_types() -> list[str]:
        return ["ensemble", "random_forest"]

    def _cache_key(self, league: str, model_type: str) -> str:
        return f"{league}:{model_type}"

    def _model_path(self, league: str, model_type: str) -> Path:
        if model_type == "ensemble":
            return MODELS_DIR / f"{league}_voting_classifier.pkl"
        if model_type == "random_forest":
            return MODELS_DIR / f"{league}_random_forest.pkl"
        raise ValueError(f"Unsupported model_type '{model_type}'.")

    def get_model_error(self, league: str, model_type: str = "ensemble") -> str | None:
        normalized_model_type = self._normalize_model_type(model_type)
        return self._model_load_errors.get(self._cache_key(league, normalized_model_type))

    def _load_model(self, league: str, model_type: str = "ensemble"):
        normalized_model_type = self._normalize_model_type(model_type)
        if league not in VALID_LEAGUES:
            raise ValueError(f"Unsupported league '{league}'.")

        cache_key = self._cache_key(league, normalized_model_type)
        if cache_key in self._model_load_errors:
            raise RuntimeError(self._model_load_errors[cache_key])

        if cache_key not in self._model_cache:
            try:
                with open(self._model_path(league, normalized_model_type), "rb") as model_file:
                    self._model_cache[cache_key] = pickle.load(model_file)
            except Exception as exc:
                self._model_load_errors[cache_key] = f"Cannot load model '{normalized_model_type}' for {league}: {exc}"
                raise RuntimeError(self._model_load_errors[cache_key]) from exc

        return self._model_cache[cache_key]

    @staticmethod
    def _team_slice(df: pd.DataFrame, team_name: str, primary_column: str, fallback_column: str) -> tuple[pd.DataFrame, bool]:
        primary_df = df[df[primary_column] == team_name]
        if not primary_df.empty:
            return primary_df, False

        fallback_df = df[df[fallback_column] == team_name]
        if not fallback_df.empty:
            return fallback_df, True

        return pd.DataFrame(columns=df.columns), True

    @staticmethod
    def _safe_mean(series: pd.Series, default_value: float) -> float:
        value = series.mean()
        if pd.isna(value):
            return float(default_value)
        return float(value)

    def _prepare_row_to_predict(
        self,
        home_team_df: pd.DataFrame,
        away_team_df: pd.DataFrame,
        numeric_columns: list[str],
        league_means: pd.Series,
    ) -> pd.DataFrame:
        row_to_predict = pd.DataFrame(columns=numeric_columns)
        row_to_predict.loc[0] = [None] * len(numeric_columns)

        home_team_final_df = home_team_df.head(5)[numeric_columns] if not home_team_df.empty else pd.DataFrame(columns=numeric_columns)
        away_team_final_df = away_team_df.head(5)[numeric_columns] if not away_team_df.empty else pd.DataFrame(columns=numeric_columns)

        for column in row_to_predict.columns:
            default_val = float(league_means[column])

            if column in HOME_TEAM_FEATURES:
                if home_team_final_df.empty:
                    row_to_predict.loc[0, column] = default_val
                else:
                    row_to_predict.loc[0, column] = self._safe_mean(home_team_final_df[column], default_val)
            elif column in AWAY_TEAM_FEATURES:
                if away_team_final_df.empty:
                    row_to_predict.loc[0, column] = default_val
                else:
                    row_to_predict.loc[0, column] = self._safe_mean(away_team_final_df[column], default_val)
            else:
                home_mean = self._safe_mean(home_team_final_df[column], default_val) if not home_team_final_df.empty else default_val
                away_mean = self._safe_mean(away_team_final_df[column], default_val) if not away_team_final_df.empty else default_val
                row_to_predict.loc[0, column] = (home_mean + away_mean) / 2

        row_to_predict = row_to_predict.fillna(league_means.to_dict()).fillna(0)
        return row_to_predict

    @staticmethod
    def _fallback_reason(fallback_reasons: list[str]) -> str | None:
        if not fallback_reasons:
            return None
        return "Fallback profile used for " + ", ".join(fallback_reasons) + "."

    def _build_match_context(self, league: str, home_team: str, away_team: str) -> dict[str, Any]:
        df = self.repository.get_processed_df(league)

        numeric_columns = df.select_dtypes(include=["number"]).columns
        if "Over2.5" in numeric_columns:
            numeric_columns = numeric_columns.drop("Over2.5")
        feature_names = list(numeric_columns)

        home_df, used_home_fallback = self._team_slice(df, home_team, "HomeTeam", "AwayTeam")
        away_df, used_away_fallback = self._team_slice(df, away_team, "AwayTeam", "HomeTeam")

        league_means = df[feature_names].mean(numeric_only=True).fillna(0)
        row = self._prepare_row_to_predict(home_df, away_df, feature_names, league_means)

        fallback_reasons = []
        if used_home_fallback:
            fallback_reasons.append(f"home team '{home_team}'")
        if used_away_fallback:
            fallback_reasons.append(f"away team '{away_team}'")

        return {
            "feature_names": feature_names,
            "row": row,
            "league_means": league_means,
            "fallback_reasons": fallback_reasons,
        }

    def predict_match(
        self,
        league: str,
        home_team: str,
        away_team: str,
        model_type: str = "ensemble",
    ) -> dict[str, Any]:
        try:
            normalized_model_type = self._normalize_model_type(model_type)
            model = self._load_model(league, normalized_model_type)
            context = self._build_match_context(league, home_team, away_team)
        except Exception as exc:
            return {
                "model_type": model_type,
                "prediction": "unknown",
                "over_2_5_probability": None,
                "under_2_5_probability": None,
                "reason": str(exc),
            }

        try:
            x_test = context["row"].values
            prediction = model.predict(x_test)[0]
            probabilities = model.predict_proba(x_test)[0]
        except Exception as exc:
            return {
                "model_type": model_type,
                "prediction": "unknown",
                "over_2_5_probability": None,
                "under_2_5_probability": None,
                "reason": f"Prediction failed: {exc}",
            }

        return {
            "model_type": normalized_model_type,
            "prediction": "over_2_5" if int(prediction) == 1 else "under_2_5",
            "over_2_5_probability": round(float(probabilities[1]), 4),
            "under_2_5_probability": round(float(probabilities[0]), 4),
            "reason": self._fallback_reason(context["fallback_reasons"]),
        }

    def explain_match_features(
        self,
        league: str,
        home_team: str,
        away_team: str,
        model_type: str = "random_forest",
        top_n: int = 8,
    ) -> dict[str, Any]:
        normalized_model_type = self._normalize_model_type(model_type)

        if normalized_model_type != "random_forest":
            return {
                "model_type": normalized_model_type,
                "items": [],
                "note": "Local feature explanation is available for random_forest only. Switch model to Random Forest.",
            }

        try:
            model = self._load_model(league, normalized_model_type)
            context = self._build_match_context(league, home_team, away_team)
        except Exception as exc:
            return {
                "model_type": normalized_model_type,
                "items": [],
                "note": f"Cannot generate explanation: {exc}",
            }

        if not hasattr(model, "feature_importances_"):
            return {
                "model_type": normalized_model_type,
                "items": [],
                "note": "Model does not expose feature importances.",
            }

        feature_names = context["feature_names"]
        importances = list(model.feature_importances_)
        row_series = context["row"].iloc[0]
        league_means = context["league_means"]

        size = min(len(feature_names), len(importances))
        ranked_items: list[dict[str, Any]] = []
        for idx in range(size):
            feature = feature_names[idx]
            global_importance = float(importances[idx])
            value = float(row_series.get(feature, 0.0))
            league_avg = float(league_means.get(feature, 0.0))

            deviation = abs(value - league_avg)
            relative_deviation = deviation / (abs(league_avg) + 1e-6)
            local_impact = global_importance * (1.0 + min(relative_deviation, 3.0))

            ranked_items.append(
                {
                    "feature": feature,
                    "importance": round(global_importance, 6),
                    "local_impact": local_impact,
                    "value": round(value, 4),
                    "league_avg": round(league_avg, 4),
                    "direction": "higher" if value >= league_avg else "lower",
                }
            )

        ranked_items = sorted(ranked_items, key=lambda item: item["local_impact"], reverse=True)
        ranked_items = ranked_items[:max(1, top_n)]

        max_impact = ranked_items[0]["local_impact"] if ranked_items else 1.0
        for item in ranked_items:
            item["score"] = round((item["local_impact"] / max_impact) * 100, 2) if max_impact > 0 else 0.0
            del item["local_impact"]

        note = (
            "Scores combine Random Forest feature importance with how different this match profile is from league average."
        )
        fallback_note = self._fallback_reason(context["fallback_reasons"])
        if fallback_note:
            note = f"{note} {fallback_note}"

        return {
            "model_type": normalized_model_type,
            "items": ranked_items,
            "note": note,
        }

    def get_feature_importance(
        self,
        league: str,
        model_type: str = "random_forest",
        top_n: int = 15,
    ) -> list[dict[str, Any]]:
        normalized_model_type = self._normalize_model_type(model_type)
        if normalized_model_type != "random_forest":
            raise ValueError("Feature importance is only available for random_forest model.")

        model = self._load_model(league, normalized_model_type)
        if not hasattr(model, "feature_importances_"):
            raise ValueError("Selected model does not expose feature_importances_.")

        df = self.repository.get_processed_df(league)
        numeric_columns = df.select_dtypes(include=["number"]).columns
        if "Over2.5" in numeric_columns:
            numeric_columns = numeric_columns.drop("Over2.5")

        feature_names = list(numeric_columns)
        importances = list(model.feature_importances_)
        size = min(len(feature_names), len(importances))
        paired = [
            {"feature": feature_names[idx], "importance": round(float(importances[idx]), 6)}
            for idx in range(size)
        ]
        paired = sorted(paired, key=lambda item: item["importance"], reverse=True)
        return paired[:max(1, top_n)]

