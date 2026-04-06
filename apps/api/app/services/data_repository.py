"""Repository for local league, match and team data."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import hashlib
import json
from pathlib import Path
from typing import Any

import pandas as pd

from ..config import NEXT_MATCHES_FILE, PROCESSED_DIR, RAW_DIR
from ..constants import COMPETITIONS, VALID_LEAGUES


@dataclass
class MatchRef:
    league: str
    date: str
    home_team: str
    away_team: str
    home_team_id: int | None = None
    away_team_id: int | None = None
    source: str = "local"


class DataRepository:
    """Loads local processed/raw files used by model and fallback API responses."""

    def __init__(self) -> None:
        self._processed_cache: dict[str, pd.DataFrame] = {}
        self._raw_cache: dict[str, pd.DataFrame] = {}
        self._next_matches_cache: dict[str, Any] | None = None

    def _csv_path(self, base_dir: Path, league: str, suffix: str) -> Path:
        return base_dir / f"{league}_{suffix}.csv"

    def get_processed_df(self, league: str) -> pd.DataFrame:
        if league not in VALID_LEAGUES:
            raise ValueError(f"Unsupported league '{league}'.")
        if league not in self._processed_cache:
            path = self._csv_path(PROCESSED_DIR, league, "merged_preprocessed")
            self._processed_cache[league] = pd.read_csv(path)
        return self._processed_cache[league]

    def get_raw_df(self, league: str) -> pd.DataFrame:
        if league not in VALID_LEAGUES:
            raise ValueError(f"Unsupported league '{league}'.")
        if league not in self._raw_cache:
            path = self._csv_path(RAW_DIR, league, "merged")
            df = pd.read_csv(path)
            if "Date" in df.columns:
                df["_parsed_date"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
            else:
                df["_parsed_date"] = pd.NaT
            self._raw_cache[league] = df
        return self._raw_cache[league]

    def get_leagues(self) -> list[dict[str, str]]:
        return [
            {
                "code": code,
                "name": COMPETITIONS[code]["name"],
                "crest": COMPETITIONS[code]["crest"],
            }
            for code in VALID_LEAGUES
        ]

    def get_teams(self, league: str) -> list[str]:
        df = self.get_processed_df(league)
        teams = sorted(set(df["HomeTeam"].dropna().tolist()) | set(df["AwayTeam"].dropna().tolist()))
        return teams

    @staticmethod
    def _to_float(value: Any, default: float = 0.0) -> float:
        if pd.isna(value):
            return default
        try:
            return float(value)
        except Exception:
            return default

    @staticmethod
    def _parse_reference_datetime(reference_date: str | None) -> datetime | None:
        if not reference_date:
            return None

        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y"):
            try:
                return datetime.strptime(reference_date, fmt)
            except ValueError:
                continue

        try:
            return pd.to_datetime(reference_date, errors="coerce").to_pydatetime()
        except Exception:
            return None

    @staticmethod
    def _outcome_for_team(home_team: str, away_team: str, fthg: float, ftag: float, team_name: str) -> str:
        if home_team == team_name:
            if fthg > ftag:
                return "W"
            if fthg == ftag:
                return "D"
            return "L"

        if away_team == team_name:
            if ftag > fthg:
                return "W"
            if ftag == fthg:
                return "D"
            return "L"

        return "D"

    def _filtered_finished_matches(self, raw_df: pd.DataFrame, before_dt: datetime | None) -> pd.DataFrame:
        df = raw_df.copy()
        df = df[pd.notna(df["FTHG"]) & pd.notna(df["FTAG"])].copy()
        if before_dt is not None:
            df = df[df["_parsed_date"] < before_dt]
        df = df[pd.notna(df["_parsed_date"])].copy()
        return df

    def _compute_table_ranks(self, raw_df: pd.DataFrame, before_dt: datetime | None) -> dict[str, int]:
        finished = self._filtered_finished_matches(raw_df, before_dt)

        table: dict[str, dict[str, float]] = {}

        for _, row in finished.iterrows():
            home = row.get("HomeTeam")
            away = row.get("AwayTeam")
            home_goals = self._to_float(row.get("FTHG"))
            away_goals = self._to_float(row.get("FTAG"))

            if not home or not away:
                continue

            table.setdefault(home, {"pts": 0.0, "gf": 0.0, "ga": 0.0})
            table.setdefault(away, {"pts": 0.0, "gf": 0.0, "ga": 0.0})

            table[home]["gf"] += home_goals
            table[home]["ga"] += away_goals
            table[away]["gf"] += away_goals
            table[away]["ga"] += home_goals

            if home_goals > away_goals:
                table[home]["pts"] += 3.0
            elif home_goals < away_goals:
                table[away]["pts"] += 3.0
            else:
                table[home]["pts"] += 1.0
                table[away]["pts"] += 1.0

        ranking = sorted(
            table.items(),
            key=lambda kv: (
                -kv[1]["pts"],
                -(kv[1]["gf"] - kv[1]["ga"]),
                -kv[1]["gf"],
                kv[0],
            ),
        )

        return {team: idx + 1 for idx, (team, _) in enumerate(ranking)}

    def _compute_team_snapshot(
        self,
        raw_df: pd.DataFrame,
        team_name: str,
        before_dt: datetime | None,
        form_window: int = 5,
        stats_window: int = 10,
    ) -> dict[str, Any]:
        finished = self._filtered_finished_matches(raw_df, before_dt)
        team_df = finished[(finished["HomeTeam"] == team_name) | (finished["AwayTeam"] == team_name)].copy()
        team_df = team_df.sort_values(by="_parsed_date", ascending=False)

        if team_df.empty:
            return {
                "rank": 99,
                "form": "N/A",
                "avg_goals": 0.0,
                "avg_conceded": 0.0,
                "win_rate": 0,
                "last5_goals": 0,
                "clean_sheet_rate": 0,
                "matches_considered": 0,
            }

        form_rows = team_df.head(form_window)
        stats_rows = team_df.head(stats_window)

        form_list: list[str] = []
        for _, row in form_rows.iterrows():
            outcome = self._outcome_for_team(
                home_team=row.get("HomeTeam"),
                away_team=row.get("AwayTeam"),
                fthg=self._to_float(row.get("FTHG")),
                ftag=self._to_float(row.get("FTAG")),
                team_name=team_name,
            )
            form_list.append(outcome)

        goals_scored: list[float] = []
        goals_conceded: list[float] = []
        wins = 0
        clean_sheets = 0

        for _, row in stats_rows.iterrows():
            home = row.get("HomeTeam")
            home_goals = self._to_float(row.get("FTHG"))
            away_goals = self._to_float(row.get("FTAG"))

            if home == team_name:
                scored = home_goals
                conceded = away_goals
            else:
                scored = away_goals
                conceded = home_goals

            goals_scored.append(scored)
            goals_conceded.append(conceded)

            if scored > conceded:
                wins += 1
            if conceded == 0:
                clean_sheets += 1

        played = len(stats_rows)
        last5_goals = int(sum(goals_scored[:5])) if goals_scored else 0

        return {
            "rank": 99,
            "form": "-".join(form_list) if form_list else "N/A",
            "avg_goals": round(sum(goals_scored) / played, 2) if played else 0.0,
            "avg_conceded": round(sum(goals_conceded) / played, 2) if played else 0.0,
            "win_rate": int(round((wins / played) * 100, 0)) if played else 0,
            "last5_goals": last5_goals,
            "clean_sheet_rate": int(round((clean_sheets / played) * 100, 0)) if played else 0,
            "matches_considered": played,
        }

    def get_match_comparison(
        self,
        league: str,
        home_team: str,
        away_team: str,
        reference_date: str | None = None,
    ) -> dict[str, Any]:
        raw_df = self.get_raw_df(league)
        before_dt = self._parse_reference_datetime(reference_date)

        ranks = self._compute_table_ranks(raw_df, before_dt)
        home_snapshot = self._compute_team_snapshot(raw_df, home_team, before_dt)
        away_snapshot = self._compute_team_snapshot(raw_df, away_team, before_dt)

        home_snapshot["rank"] = ranks.get(home_team, home_snapshot["rank"])
        away_snapshot["rank"] = ranks.get(away_team, away_snapshot["rank"])

        warning = None
        if home_snapshot.get("matches_considered", 0) == 0 or away_snapshot.get("matches_considered", 0) == 0:
            warning = "One or both teams have limited historical data before match date."

        return {
            "home": home_snapshot,
            "away": away_snapshot,
            "warning": warning,
            "computed_from": "historical finished matches",
        }

    def get_recent_team_matches(self, league: str, team_name: str, limit: int = 5) -> list[dict[str, Any]]:
        raw_df = self.get_raw_df(league)
        filtered = raw_df[(raw_df["HomeTeam"] == team_name) | (raw_df["AwayTeam"] == team_name)].copy()
        filtered = filtered.sort_values(by="_parsed_date", ascending=False).head(limit)

        results: list[dict[str, Any]] = []
        for _, row in filtered.iterrows():
            home = row.get("HomeTeam")
            away = row.get("AwayTeam")
            fthg = int(row.get("FTHG", 0)) if pd.notna(row.get("FTHG")) else None
            ftag = int(row.get("FTAG", 0)) if pd.notna(row.get("FTAG")) else None
            dt = row.get("_parsed_date")
            date_value = dt.strftime("%Y-%m-%d") if pd.notna(dt) else str(row.get("Date", ""))

            if fthg is None or ftag is None:
                outcome = None
            elif home == team_name:
                outcome = "W" if fthg > ftag else "D" if fthg == ftag else "L"
            else:
                outcome = "W" if ftag > fthg else "D" if fthg == ftag else "L"

            results.append(
                {
                    "date": date_value,
                    "home_team": home,
                    "away_team": away,
                    "home_goals": fthg,
                    "away_goals": ftag,
                    "team_outcome": outcome,
                }
            )
        return results

    def _load_next_matches(self) -> dict[str, Any]:
        if self._next_matches_cache is not None:
            return self._next_matches_cache

        if not NEXT_MATCHES_FILE.exists():
            self._next_matches_cache = {}
            return {}

        content: dict[str, Any] | None = None
        for enc in ("utf-16", "utf-8"):
            try:
                with open(NEXT_MATCHES_FILE, "r", encoding=enc) as file:
                    content = json.load(file)
                break
            except UnicodeError:
                continue

        self._next_matches_cache = content or {}
        return self._next_matches_cache

    @staticmethod
    def build_match_id(league: str, date: str, home_team: str, away_team: str) -> str:
        key = f"{league}|{date}|{home_team}|{away_team}".encode("utf-8")
        digest = hashlib.md5(key).hexdigest()[:12]
        return f"{league.lower()}-{digest}"

    def get_fallback_upcoming_matches(self, league: str | None = None) -> list[dict[str, Any]]:
        data = self._load_next_matches()
        leagues = [league] if league else VALID_LEAGUES

        items: list[dict[str, Any]] = []
        for league_code in leagues:
            league_data = data.get(league_code, {})
            matches = league_data.get("next_matches", [])
            for match in matches:
                date_val = match.get("date")
                home = match.get("home_team")
                away = match.get("away_team")
                items.append(
                    {
                        "match_id": self.build_match_id(league_code, date_val, home, away),
                        "league": league_code,
                        "league_name": COMPETITIONS[league_code]["name"],
                        "date": date_val,
                        "home_team": home,
                        "away_team": away,
                        "home_team_crest": match.get("home_team_crest"),
                        "away_team_crest": match.get("away_team_crest"),
                        "home_team_id": None,
                        "away_team_id": None,
                        "source": "local",
                    }
                )

        def _to_dt(value: str) -> datetime:
            try:
                return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
            except Exception:
                return datetime.max

        return sorted(items, key=lambda x: _to_dt(x["date"]))

    def find_match_by_id(self, match_id: str, matches: list[dict[str, Any]]) -> dict[str, Any] | None:
        for match in matches:
            if match.get("match_id") == match_id:
                return match
        return None
