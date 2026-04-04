"""Client for football-data.org live endpoints."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
import re
from typing import Any
import unicodedata

import requests

from ..config import API_FOOTBALL_DATA
from ..constants import COMPETITIONS, TEAM_NAME_MAPPING, VALID_LEAGUES
from .data_repository import DataRepository


GENERIC_TOKENS = {"fc", "cf", "afc", "cfc"}


def _normalize_name(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized).strip()
    return re.sub(r"\s+", " ", normalized)


def _strip_generic_tokens(value: str) -> str:
    tokens = [token for token in value.split(" ") if token and token not in GENERIC_TOKENS]
    return " ".join(tokens)


def _parse_iso_date(raw_value: str | None) -> date | None:
    if not raw_value:
        return None
    try:
        if "T" in raw_value:
            return datetime.fromisoformat(raw_value.replace("Z", "+00:00")).date()
        return datetime.strptime(raw_value, "%Y-%m-%d").date()
    except Exception:
        return None


def _compute_age(raw_value: str | None) -> int | None:
    dob = _parse_iso_date(raw_value)
    if not dob:
        return None
    today = datetime.now(timezone.utc).date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class FootballDataClient:
    def __init__(self, repository: DataRepository) -> None:
        self.repository = repository
        self.base_url = "https://api.football-data.org/v4"
        self.headers = {"X-Auth-Token": API_FOOTBALL_DATA} if API_FOOTBALL_DATA else {}
        self._matches_cache: dict[str, tuple[datetime, list[dict[str, Any]]]] = {}
        self._players_cache: dict[int, tuple[datetime, list[dict[str, Any]]]] = {}
        self._player_detail_cache: dict[int, tuple[datetime, dict[str, Any]]] = {}
        self._competition_teams_cache: dict[str, tuple[datetime, list[dict[str, Any]]]] = {}
        self._competition_team_index: dict[str, dict[str, int]] = {}
        self._competition_team_index_reduced: dict[str, dict[str, int]] = {}
        self._league_team_index: dict[str, dict[str, str]] = {}
        self._league_team_index_reduced: dict[str, dict[str, str]] = {}
        self._normalized_mapping = {_normalize_name(k): v for k, v in TEAM_NAME_MAPPING.items()}

    @property
    def is_enabled(self) -> bool:
        return bool(API_FOOTBALL_DATA)

    def _cache_valid(self, cached_at: datetime, ttl_seconds: int) -> bool:
        return datetime.now(timezone.utc) - cached_at < timedelta(seconds=ttl_seconds)

    def _build_team_index(self, league: str) -> None:
        if league in self._league_team_index:
            return

        teams = self.repository.get_teams(league)
        norm_index: dict[str, str] = {}
        reduced_index: dict[str, str] = {}

        for team in teams:
            norm = _normalize_name(team)
            if norm and norm not in norm_index:
                norm_index[norm] = team

            reduced = _strip_generic_tokens(norm)
            if reduced and reduced not in reduced_index:
                reduced_index[reduced] = team

        self._league_team_index[league] = norm_index
        self._league_team_index_reduced[league] = reduced_index

    def _resolve_team_name(self, api_name: str | None, league: str) -> str | None:
        if not api_name:
            return api_name

        if api_name in TEAM_NAME_MAPPING:
            return TEAM_NAME_MAPPING[api_name]

        norm = _normalize_name(api_name)
        if norm in self._normalized_mapping:
            return self._normalized_mapping[norm]

        self._build_team_index(league)

        if norm in self._league_team_index[league]:
            return self._league_team_index[league][norm]

        reduced = _strip_generic_tokens(norm)
        if reduced in self._league_team_index_reduced[league]:
            return self._league_team_index_reduced[league][reduced]

        return api_name

    def _get_competition_teams(self, league: str) -> list[dict[str, Any]]:
        if not self.is_enabled or league not in COMPETITIONS:
            return []

        cached = self._competition_teams_cache.get(league)
        if cached and self._cache_valid(cached[0], ttl_seconds=1800):
            return cached[1]

        competition = COMPETITIONS[league]
        url = f"{self.base_url}/competitions/{competition['id']}/teams"
        try:
            response = requests.get(url, headers=self.headers, timeout=20)
            response.raise_for_status()
            payload = response.json().get("teams", [])
        except Exception:
            return cached[1] if cached else []

        self._competition_teams_cache[league] = (datetime.now(timezone.utc), payload)
        return payload

    def _build_competition_team_index(self, league: str) -> None:
        if league in self._competition_team_index and league in self._competition_team_index_reduced:
            return

        norm_index: dict[str, int] = {}
        reduced_index: dict[str, int] = {}

        for team in self._get_competition_teams(league):
            team_id = team.get("id")
            if not team_id:
                continue

            api_name = team.get("name")
            short_name = team.get("shortName")
            tla = team.get("tla")
            mapped_name = self._resolve_team_name(api_name, league)

            for candidate in (api_name, short_name, mapped_name, tla):
                norm = _normalize_name(candidate)
                if not norm:
                    continue

                if norm not in norm_index:
                    norm_index[norm] = int(team_id)

                reduced = _strip_generic_tokens(norm)
                if reduced and reduced not in reduced_index:
                    reduced_index[reduced] = int(team_id)

        self._competition_team_index[league] = norm_index
        self._competition_team_index_reduced[league] = reduced_index

    def resolve_team_id(self, league: str, team_name: str | None) -> int | None:
        if not team_name or league not in COMPETITIONS:
            return None

        self._build_competition_team_index(league)

        norm = _normalize_name(team_name)
        reduced = _strip_generic_tokens(norm)
        norm_index = self._competition_team_index.get(league, {})
        reduced_index = self._competition_team_index_reduced.get(league, {})

        if norm in norm_index:
            return norm_index[norm]
        if reduced in reduced_index:
            return reduced_index[reduced]

        for key, team_id in norm_index.items():
            if norm and (norm in key or key in norm):
                return team_id

        for key, team_id in reduced_index.items():
            if reduced and (reduced in key or key in reduced):
                return team_id

        return None

    def get_upcoming_matches(self, league: str | None = None, limit: int = 30) -> list[dict[str, Any]]:
        if not self.is_enabled:
            return []

        cache_key = league or "all"
        if cache_key in self._matches_cache:
            cached_at, payload = self._matches_cache[cache_key]
            if self._cache_valid(cached_at, ttl_seconds=300):
                return payload

        leagues = [league] if league else VALID_LEAGUES
        all_matches: list[dict[str, Any]] = []

        for league_code in leagues:
            competition = COMPETITIONS[league_code]
            url = f"{self.base_url}/competitions/{competition['id']}/matches"
            params = {"status": "SCHEDULED"}
            try:
                response = requests.get(url, headers=self.headers, params=params, timeout=20)
                response.raise_for_status()
                data = response.json()
            except Exception:
                continue

            for match in data.get("matches", [])[:limit]:
                utc_date = match.get("utcDate")
                parsed = None
                if utc_date:
                    try:
                        parsed = datetime.strptime(utc_date, "%Y-%m-%dT%H:%M:%SZ")
                    except ValueError:
                        parsed = None

                home_api_name = match.get("homeTeam", {}).get("name")
                away_api_name = match.get("awayTeam", {}).get("name")
                home_name = self._resolve_team_name(home_api_name, league_code)
                away_name = self._resolve_team_name(away_api_name, league_code)
                date_str = parsed.strftime("%Y-%m-%d %H:%M:%S") if parsed else utc_date

                all_matches.append(
                    {
                        "match_id": self.repository.build_match_id(league_code, date_str, home_name, away_name),
                        "league": league_code,
                        "league_name": competition["name"],
                        "date": date_str,
                        "home_team": home_name,
                        "away_team": away_name,
                        "home_team_crest": match.get("homeTeam", {}).get("crest"),
                        "away_team_crest": match.get("awayTeam", {}).get("crest"),
                        "home_team_id": match.get("homeTeam", {}).get("id"),
                        "away_team_id": match.get("awayTeam", {}).get("id"),
                        "source": "football-data.org",
                    }
                )

        def _sort_key(item: dict[str, Any]):
            try:
                return datetime.strptime(item["date"], "%Y-%m-%d %H:%M:%S")
            except Exception:
                return datetime.max

        payload = sorted(all_matches, key=_sort_key)
        self._matches_cache[cache_key] = (datetime.now(timezone.utc), payload)
        return payload

    def get_team_players(self, team_id: int | None) -> list[dict[str, Any]]:
        if not self.is_enabled or not team_id:
            return []

        if team_id in self._players_cache:
            cached_at, payload = self._players_cache[team_id]
            if self._cache_valid(cached_at, ttl_seconds=1800):
                return payload

        url = f"{self.base_url}/teams/{team_id}"
        try:
            response = requests.get(url, headers=self.headers, timeout=20)
            response.raise_for_status()
            data = response.json()
        except Exception:
            return []

        team_name = data.get("name")
        players: list[dict[str, Any]] = []

        for member in data.get("squad", []):
            date_of_birth = member.get("dateOfBirth")
            player_payload = {
                "id": member.get("id"),
                "name": member.get("name"),
                "first_name": member.get("firstName"),
                "last_name": member.get("lastName"),
                "position": member.get("position"),
                "nationality": member.get("nationality"),
                "date_of_birth": date_of_birth,
                "age": _compute_age(date_of_birth),
                "shirt_number": member.get("shirtNumber"),
                "role": member.get("role"),
                "section": member.get("section"),
                "team_id": team_id,
                "team_name": team_name,
            }
            players.append(player_payload)
            if player_payload["id"]:
                self._player_detail_cache[player_payload["id"]] = (datetime.now(timezone.utc), player_payload)

        self._players_cache[team_id] = (datetime.now(timezone.utc), players)
        return players

    def get_player_detail(self, player_id: int | None) -> dict[str, Any]:
        if not player_id:
            return {}

        cached = self._player_detail_cache.get(player_id)
        if cached and self._cache_valid(cached[0], ttl_seconds=3600):
            return cached[1]

        if not self.is_enabled:
            return cached[1] if cached else {}

        url = f"{self.base_url}/persons/{player_id}"
        try:
            response = requests.get(url, headers=self.headers, timeout=20)
            response.raise_for_status()
            data = response.json()
        except Exception:
            return cached[1] if cached else {}

        current_team = data.get("currentTeam") or {}
        area = data.get("area") or {}
        date_of_birth = data.get("dateOfBirth")

        detail = {
            "id": data.get("id", player_id),
            "name": data.get("name"),
            "first_name": data.get("firstName"),
            "last_name": data.get("lastName"),
            "position": data.get("position"),
            "nationality": data.get("nationality") or area.get("name"),
            "date_of_birth": date_of_birth,
            "age": _compute_age(date_of_birth),
            "shirt_number": data.get("shirtNumber"),
            "team_id": current_team.get("id"),
            "team_name": current_team.get("name"),
            "contract_until": current_team.get("contract", {}).get("until") if isinstance(current_team, dict) else None,
            "last_updated": data.get("lastUpdated"),
        }

        if cached:
            merged = dict(cached[1])
            merged.update({k: v for k, v in detail.items() if v is not None})
            detail = merged

        self._player_detail_cache[player_id] = (datetime.now(timezone.utc), detail)
        return detail
