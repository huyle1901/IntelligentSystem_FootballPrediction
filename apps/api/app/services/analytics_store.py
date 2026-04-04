"""SQLite-backed analytics tracking for admin dashboard."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..config import ANALYTICS_DB


class AnalyticsStore:
    def __init__(self, db_path: Path = ANALYTICS_DB) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS team_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    league TEXT NOT NULL,
                    team_name TEXT NOT NULL,
                    viewed_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS player_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    league TEXT,
                    team_name TEXT,
                    player_name TEXT NOT NULL,
                    viewed_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS match_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    league TEXT NOT NULL,
                    match_id TEXT NOT NULL,
                    viewed_at TEXT NOT NULL
                )
                """
            )

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def track_team_view(self, league: str, team_name: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO team_views (league, team_name, viewed_at) VALUES (?, ?, ?)",
                (league, team_name, self._now()),
            )

    def track_player_view(self, player_name: str, team_name: str | None = None, league: str | None = None) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO player_views (league, team_name, player_name, viewed_at) VALUES (?, ?, ?, ?)",
                (league, team_name, player_name, self._now()),
            )

    def track_match_view(self, league: str, match_id: str) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO match_views (league, match_id, viewed_at) VALUES (?, ?, ?)",
                (league, match_id, self._now()),
            )

    def top_teams(self, limit: int = 10) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT league, team_name, COUNT(*) AS views
                FROM team_views
                GROUP BY league, team_name
                ORDER BY views DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def top_players(self, limit: int = 10) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT league, team_name, player_name, COUNT(*) AS views
                FROM player_views
                GROUP BY league, team_name, player_name
                ORDER BY views DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]
