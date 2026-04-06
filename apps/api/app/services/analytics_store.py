"""SQLite-backed analytics + lightweight auth store for MVP."""

from __future__ import annotations

import hashlib
import hmac
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from ..config import ALLOWED_ROLES, ANALYTICS_DB


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
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    username TEXT,
                    display_name TEXT,
                    role TEXT,
                    password_hash TEXT,
                    password_salt TEXT,
                    created_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL
                )
                """
            )

            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS team_views (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT,
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
                    user_id TEXT,
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
                    user_id TEXT,
                    league TEXT NOT NULL,
                    match_id TEXT NOT NULL,
                    viewed_at TEXT NOT NULL
                )
                """
            )

            self._ensure_column(conn, "users", "username", "TEXT")
            self._ensure_column(conn, "users", "display_name", "TEXT")
            self._ensure_column(conn, "users", "role", "TEXT")
            self._ensure_column(conn, "users", "password_hash", "TEXT")
            self._ensure_column(conn, "users", "password_salt", "TEXT")

            self._ensure_column(conn, "team_views", "user_id", "TEXT")
            self._ensure_column(conn, "player_views", "user_id", "TEXT")
            self._ensure_column(conn, "match_views", "user_id", "TEXT")

            conn.execute("UPDATE users SET role = 'user' WHERE role IS NULL OR role = ''")

            conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_team_views_user_id ON team_views(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_player_views_user_id ON player_views(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_match_views_user_id ON match_views(user_id)")

    def _ensure_column(self, conn: sqlite3.Connection, table_name: str, column_name: str, column_sql: str) -> None:
        rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        existing = {row[1] for row in rows}
        if column_name not in existing:
            conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_sql}")

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _normalize_user_id(user_id: str | None) -> str:
        value = (user_id or "").strip()
        return value if value else "anonymous"

    @staticmethod
    def _normalize_role(role: str | None) -> str:
        value = (role or "user").strip()
        return value if value in ALLOWED_ROLES else "user"

    @staticmethod
    def _hash_password(password: str, salt: str) -> str:
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            120000,
        )
        return digest.hex()

    @staticmethod
    def _public_user_payload(row: sqlite3.Row | dict[str, Any] | None) -> dict[str, Any] | None:
        if not row:
            return None
        item = dict(row)
        return {
            "user_id": item.get("user_id"),
            "username": item.get("username"),
            "display_name": item.get("display_name"),
            "role": item.get("role") or "user",
            "created_at": item.get("created_at"),
            "last_seen_at": item.get("last_seen_at"),
        }

    def get_user_by_id(self, user_id: str | None) -> dict[str, Any] | None:
        normalized = self._normalize_user_id(user_id)
        with self._connect() as conn:
            row = conn.execute(
                "SELECT user_id, username, display_name, role, created_at, last_seen_at FROM users WHERE user_id = ?",
                (normalized,),
            ).fetchone()
        return self._public_user_payload(row)

    def register_user(
        self,
        username: str,
        password: str,
        display_name: str | None = None,
        role: str = "user",
    ) -> dict[str, Any]:
        normalized_username = username.strip().lower()
        if len(normalized_username) < 3:
            raise ValueError("Username must contain at least 3 characters.")
        if len(password) < 6:
            raise ValueError("Password must contain at least 6 characters.")

        requested_role = (role or "user").strip()
        if requested_role not in ALLOWED_ROLES:
            raise ValueError(f"Role must be one of {sorted(ALLOWED_ROLES)}")
        normalized_role = requested_role

        now = self._now()
        salt = secrets.token_hex(16)
        password_hash = self._hash_password(password, salt)
        user_id = str(uuid4())
        final_display = (display_name or normalized_username).strip() or normalized_username

        with self._connect() as conn:
            existing = conn.execute(
                "SELECT user_id FROM users WHERE username = ?",
                (normalized_username,),
            ).fetchone()
            if existing:
                raise ValueError("Username already exists.")

            conn.execute(
                """
                INSERT INTO users (user_id, username, display_name, role, password_hash, password_salt, created_at, last_seen_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (user_id, normalized_username, final_display, normalized_role, password_hash, salt, now, now),
            )

            row = conn.execute(
                "SELECT user_id, username, display_name, role, created_at, last_seen_at FROM users WHERE user_id = ?",
                (user_id,),
            ).fetchone()

        return self._public_user_payload(row) or {
            "user_id": user_id,
            "username": normalized_username,
            "display_name": final_display,
            "role": normalized_role,
            "created_at": now,
            "last_seen_at": now,
        }

    def authenticate_user(self, username: str, password: str) -> dict[str, Any] | None:
        normalized_username = username.strip().lower()

        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT user_id, username, display_name, role, password_hash, password_salt, created_at, last_seen_at
                FROM users
                WHERE username = ?
                """,
                (normalized_username,),
            ).fetchone()

            if not row:
                return None

            expected = row["password_hash"] or ""
            salt = row["password_salt"] or ""
            candidate = self._hash_password(password, salt)
            if not expected or not hmac.compare_digest(candidate, expected):
                return None

            now = self._now()
            conn.execute("UPDATE users SET last_seen_at = ? WHERE user_id = ?", (now, row["user_id"]))
            updated = conn.execute(
                "SELECT user_id, username, display_name, role, created_at, last_seen_at FROM users WHERE user_id = ?",
                (row["user_id"],),
            ).fetchone()

        return self._public_user_payload(updated)

    def ensure_user(
        self,
        user_id: str | None,
        display_name: str | None = None,
        role: str | None = None,
    ) -> str:
        normalized = self._normalize_user_id(user_id)
        requested_role = (role or "user").strip()
        if requested_role not in ALLOWED_ROLES:
            raise ValueError(f"Role must be one of {sorted(ALLOWED_ROLES)}")
        normalized_role = requested_role
        now = self._now()

        with self._connect() as conn:
            row = conn.execute(
                "SELECT user_id, username, display_name, role FROM users WHERE user_id = ?",
                (normalized,),
            ).fetchone()

            if row:
                conn.execute(
                    """
                    UPDATE users
                    SET last_seen_at = ?,
                        display_name = COALESCE(?, display_name),
                        role = COALESCE(?, role)
                    WHERE user_id = ?
                    """,
                    (now, display_name, normalized_role if role else None, normalized),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO users (user_id, username, display_name, role, password_hash, password_salt, created_at, last_seen_at)
                    VALUES (?, NULL, ?, ?, NULL, NULL, ?, ?)
                    """,
                    (normalized, display_name, normalized_role, now, now),
                )

        return normalized

    def track_team_view(self, league: str, team_name: str, user_id: str | None = None) -> None:
        normalized = self.ensure_user(user_id=user_id)
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO team_views (user_id, league, team_name, viewed_at) VALUES (?, ?, ?, ?)",
                (normalized, league, team_name, self._now()),
            )

    def track_player_view(
        self,
        player_name: str,
        team_name: str | None = None,
        league: str | None = None,
        user_id: str | None = None,
    ) -> None:
        normalized = self.ensure_user(user_id=user_id)
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO player_views (user_id, league, team_name, player_name, viewed_at) VALUES (?, ?, ?, ?, ?)",
                (normalized, league, team_name, player_name, self._now()),
            )

    def track_match_view(self, league: str, match_id: str, user_id: str | None = None) -> None:
        normalized = self.ensure_user(user_id=user_id)
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO match_views (user_id, league, match_id, viewed_at) VALUES (?, ?, ?, ?)",
                (normalized, league, match_id, self._now()),
            )

    def top_teams(self, limit: int = 10, user_id: str | None = None) -> list[dict[str, Any]]:
        normalized = self._normalize_user_id(user_id) if user_id else None

        query = """
            SELECT league, team_name, COUNT(*) AS views
            FROM team_views
        """
        params: tuple[Any, ...] = ()
        if normalized:
            query += " WHERE user_id = ? "
            params = (normalized,)

        query += """
            GROUP BY league, team_name
            ORDER BY views DESC
            LIMIT ?
        """
        params = (*params, limit)

        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    def top_players(self, limit: int = 10, user_id: str | None = None) -> list[dict[str, Any]]:
        normalized = self._normalize_user_id(user_id) if user_id else None

        query = """
            SELECT league, team_name, player_name, COUNT(*) AS views
            FROM player_views
        """
        params: tuple[Any, ...] = ()
        if normalized:
            query += " WHERE user_id = ? "
            params = (normalized,)

        query += """
            GROUP BY league, team_name, player_name
            ORDER BY views DESC
            LIMIT ?
        """
        params = (*params, limit)

        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    def top_matches(self, limit: int = 10, user_id: str | None = None) -> list[dict[str, Any]]:
        normalized = self._normalize_user_id(user_id) if user_id else None

        query = """
            SELECT league, match_id, COUNT(*) AS views
            FROM match_views
        """
        params: tuple[Any, ...] = ()
        if normalized:
            query += " WHERE user_id = ? "
            params = (normalized,)

        query += """
            GROUP BY league, match_id
            ORDER BY views DESC
            LIMIT ?
        """
        params = (*params, limit)

        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]

    def list_users(self, limit: int = 100) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    u.user_id,
                    u.username,
                    u.display_name,
                    u.role,
                    u.created_at,
                    u.last_seen_at,
                    COALESCE(tv.team_views, 0) AS team_views,
                    COALESCE(pv.player_views, 0) AS player_views,
                    COALESCE(mv.match_views, 0) AS match_views,
                    COALESCE(tv.team_views, 0) + COALESCE(pv.player_views, 0) + COALESCE(mv.match_views, 0) AS total_views
                FROM users u
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS team_views
                    FROM team_views
                    GROUP BY user_id
                ) tv ON tv.user_id = u.user_id
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS player_views
                    FROM player_views
                    GROUP BY user_id
                ) pv ON pv.user_id = u.user_id
                LEFT JOIN (
                    SELECT user_id, COUNT(*) AS match_views
                    FROM match_views
                    GROUP BY user_id
                ) mv ON mv.user_id = u.user_id
                ORDER BY total_views DESC, u.last_seen_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def user_activity(self, user_id: str, limit: int = 10) -> dict[str, Any]:
        normalized = self._normalize_user_id(user_id)

        with self._connect() as conn:
            user = conn.execute(
                "SELECT user_id, username, display_name, role, created_at, last_seen_at FROM users WHERE user_id = ?",
                (normalized,),
            ).fetchone()

            if not user:
                return {
                    "user": None,
                    "summary": {"team_views": 0, "player_views": 0, "match_views": 0, "total_views": 0},
                    "top_teams": [],
                    "top_players": [],
                    "top_matches": [],
                }

            team_views = conn.execute("SELECT COUNT(*) AS c FROM team_views WHERE user_id = ?", (normalized,)).fetchone()[0]
            player_views = conn.execute("SELECT COUNT(*) AS c FROM player_views WHERE user_id = ?", (normalized,)).fetchone()[0]
            match_views = conn.execute("SELECT COUNT(*) AS c FROM match_views WHERE user_id = ?", (normalized,)).fetchone()[0]

        return {
            "user": dict(user),
            "summary": {
                "team_views": int(team_views),
                "player_views": int(player_views),
                "match_views": int(match_views),
                "total_views": int(team_views + player_views + match_views),
            },
            "top_teams": self.top_teams(limit=limit, user_id=normalized),
            "top_players": self.top_players(limit=limit, user_id=normalized),
            "top_matches": self.top_matches(limit=limit, user_id=normalized),
        }


