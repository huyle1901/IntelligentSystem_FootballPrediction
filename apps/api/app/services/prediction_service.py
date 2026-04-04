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

    def _model_path(self, league: str) -> Path:
        return MODELS_DIR / f"{league}_voting_classifier.pkl"

    def get_model_error(self, league: str) -> str | None:
        return self._model_load_errors.get(league)

    def _load_model(self, league: str):
        if league not in VALID_LEAGUES:
            raise ValueError(f"Unsupported league '{league}'.")
        if league in self._model_load_errors:
            raise RuntimeError(self._model_load_errors[league])
        if league not in self._model_cache:
            try:
                with open(self._model_path(league), "rb") as model_file:
                    self._model_cache[league] = pickle.load(model_file)
            except Exception as exc:
                self._model_load_errors[league] = f"Cannot load model for {league}: {exc}"
                raise RuntimeError(self._model_load_errors[league]) from exc
        return self._model_cache[league]

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

    def predict_match(self, league: str, home_team: str, away_team: str) -> dict[str, Any]:
        df = self.repository.get_processed_df(league)

        try:
            model = self._load_model(league)
        except Exception as exc:
            return {
                "prediction": "unknown",
                "over_2_5_probability": None,
                "under_2_5_probability": None,
                "reason": str(exc),
            }

        numeric_columns = df.select_dtypes(include=["number"]).columns
        if "Over2.5" in numeric_columns:
            numeric_columns = numeric_columns.drop("Over2.5")
        numeric_columns_list = list(numeric_columns)

        home_df, used_home_fallback = self._team_slice(df, home_team, "HomeTeam", "AwayTeam")
        away_df, used_away_fallback = self._team_slice(df, away_team, "AwayTeam", "HomeTeam")

        league_means = df[numeric_columns_list].mean(numeric_only=True).fillna(0)
        row = self._prepare_row_to_predict(home_df, away_df, numeric_columns_list, league_means)

        try:
            x_test = row.values
            prediction = model.predict(x_test)[0]
            probabilities = model.predict_proba(x_test)[0]
        except Exception as exc:
            return {
                "prediction": "unknown",
                "over_2_5_probability": None,
                "under_2_5_probability": None,
                "reason": f"Prediction failed: {exc}",
            }

        fallback_reasons = []
        if used_home_fallback:
            fallback_reasons.append(f"home team '{home_team}'")
        if used_away_fallback:
            fallback_reasons.append(f"away team '{away_team}'")

        reason = None
        if fallback_reasons:
            reason = "Fallback profile used for " + ", ".join(fallback_reasons) + "."

        return {
            "prediction": "over_2_5" if int(prediction) == 1 else "under_2_5",
            "over_2_5_probability": round(float(probabilities[1]), 4),
            "under_2_5_probability": round(float(probabilities[0]), 4),
            "reason": reason,
        }
