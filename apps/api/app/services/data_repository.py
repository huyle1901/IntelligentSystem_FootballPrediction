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
