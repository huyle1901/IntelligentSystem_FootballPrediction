"""User-facing endpoints for mobile/web app."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field

from ..constants import VALID_LEAGUES
from ..dependencies import require_role

router = APIRouter(prefix="/user", tags=["user"])


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)
    display_name: str | None = Field(default=None, max_length=100)
    role: str = Field(default="user", max_length=32)


class LoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=6, max_length=128)


def _request_user_id(request: Request) -> str:
    raw = request.headers.get("X-User-Id", "")
    value = raw.strip()
    return value if value else "anonymous"


def _resolve_upcoming_matches(request: Request, league: str | None, limit: int) -> list[dict]:
    live = request.app.state.football_client.get_upcoming_matches(league=league, limit=limit)
    if live:
        return live[:limit]

    fallback = request.app.state.repository.get_fallback_upcoming_matches(league=league)
    return fallback[:limit]


def _resolve_team_id_from_matches(matches: list[dict], team_name: str) -> int | None:
    for match in matches:
        if match.get("home_team") == team_name and match.get("home_team_id"):
            return int(match["home_team_id"])
        if match.get("away_team") == team_name and match.get("away_team_id"):
            return int(match["away_team_id"])
    return None


def _resolve_team_id(
    request: Request,
    league: str,
    team_name: str | None,
    provided_team_id: int | None,
) -> int | None:
    if provided_team_id:
        return provided_team_id

    if not team_name:
        return None

    matches = _resolve_upcoming_matches(request=request, league=league, limit=120)
    team_id = _resolve_team_id_from_matches(matches, team_name)
    if team_id:
        return team_id

    return request.app.state.football_client.resolve_team_id(league=league, team_name=team_name)


@router.post("/auth/register")
def register_user(
    payload: RegisterRequest,
    request: Request,
):
    try:
        user = request.app.state.analytics.register_user(
            username=payload.username,
            password=payload.password,
            display_name=payload.display_name,
            role=payload.role,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"user": user, "status": "registered"}


@router.post("/auth/login")
def login_user(
    payload: LoginRequest,
    request: Request,
):
    user = request.app.state.analytics.authenticate_user(
        username=payload.username,
        password=payload.password,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    return {"user": user, "status": "logged_in"}


@router.post("/session")
def create_or_touch_session(
    request: Request,
    display_name: str | None = Query(default=None),
    _role: str = Depends(require_role("user")),
):
    user_id = _request_user_id(request)
    normalized = request.app.state.analytics.ensure_user(user_id=user_id, display_name=display_name)
    return {"user_id": normalized, "status": "ok"}


@router.get("/leagues")
def get_leagues(request: Request, _role: str = Depends(require_role("user"))):
    return {"items": request.app.state.repository.get_leagues()}


@router.get("/matches/upcoming")
def get_upcoming_matches(
    request: Request,
    league: str | None = Query(default=None),
    limit: int = Query(default=40, ge=1, le=100),
    _role: str = Depends(require_role("user")),
):
    if league and league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail=f"Unsupported league '{league}'.")
    items = _resolve_upcoming_matches(request=request, league=league, limit=limit)
    return {"items": items}


@router.get("/leagues/{league}/teams")
def get_teams_by_league(
    league: str,
    request: Request,
    _role: str = Depends(require_role("user")),
):
    if league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail=f"Unsupported league '{league}'.")
    teams = request.app.state.repository.get_teams(league)
    return {"league": league, "items": teams}


@router.get("/teams/{team_name}/overview")
def get_team_overview(
    team_name: str,
    request: Request,
    league: str = Query(...),
    _role: str = Depends(require_role("user")),
):
    if league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail=f"Unsupported league '{league}'.")

    teams = request.app.state.repository.get_teams(league)
    if team_name not in teams:
        raise HTTPException(status_code=404, detail=f"Team '{team_name}' not found in league '{league}'.")

    request.app.state.analytics.track_team_view(
        league=league,
        team_name=team_name,
        user_id=_request_user_id(request),
    )

    recent_matches = request.app.state.repository.get_recent_team_matches(league=league, team_name=team_name)
    upcoming = _resolve_upcoming_matches(request=request, league=league, limit=80)
    next_matches = [
        item
        for item in upcoming
        if item.get("home_team") == team_name or item.get("away_team") == team_name
    ]

    return {
        "league": league,
        "team_name": team_name,
        "recent_matches": recent_matches,
        "next_matches": next_matches,
    }


@router.get("/matches/{match_id}/prediction")
def get_match_prediction(
    match_id: str,
    request: Request,
    league: str = Query(...),
    model_type: str = Query(default="ensemble"),
    _role: str = Depends(require_role("user")),
):
    if league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail=f"Unsupported league '{league}'.")

    matches = _resolve_upcoming_matches(request=request, league=league, limit=150)
    match = request.app.state.repository.find_match_by_id(match_id, matches)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    request.app.state.analytics.track_match_view(
        league=league,
        match_id=match_id,
        user_id=_request_user_id(request),
    )
    prediction = request.app.state.predictor.predict_match(
        league=league,
        home_team=match["home_team"],
        away_team=match["away_team"],
        model_type=model_type,
    )

    return {
        "match": match,
        "prediction": prediction,
    }


@router.get("/matches/{match_id}/explain")
def get_match_explanation(
    match_id: str,
    request: Request,
    league: str = Query(...),
    model_type: str = Query(default="random_forest"),
    top_n: int = Query(default=8, ge=5, le=20),
    _role: str = Depends(require_role("user")),
):
    if league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail=f"Unsupported league '{league}'.")

    matches = _resolve_upcoming_matches(request=request, league=league, limit=150)
    match = request.app.state.repository.find_match_by_id(match_id, matches)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    explanation = request.app.state.predictor.explain_match_features(
        league=league,
        home_team=match["home_team"],
        away_team=match["away_team"],
        model_type=model_type,
        top_n=top_n,
    )

    return {
        "match": match,
        "explanation": explanation,
    }


@router.get("/matches/{match_id}/comparison")
def get_match_comparison(
    match_id: str,
    request: Request,
    league: str = Query(...),
    _role: str = Depends(require_role("user")),
):
    if league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail=f"Unsupported league '{league}'.")

    matches = _resolve_upcoming_matches(request=request, league=league, limit=150)
    match = request.app.state.repository.find_match_by_id(match_id, matches)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    comparison = request.app.state.repository.get_match_comparison(
        league=league,
        home_team=match["home_team"],
        away_team=match["away_team"],
        reference_date=match.get("date"),
    )

    return {
        "match": match,
        "comparison": comparison,
    }


@router.get("/teams/{team_name}/players")
def get_team_players(
    team_name: str,
    request: Request,
    league: str = Query(...),
    team_id: int | None = Query(default=None),
    _role: str = Depends(require_role("user")),
):
    if league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail=f"Unsupported league '{league}'.")

    resolved_team_id = _resolve_team_id(
        request=request,
        league=league,
        team_name=team_name,
        provided_team_id=team_id,
    )

    players = request.app.state.football_client.get_team_players(resolved_team_id)
    return {
        "team_name": team_name,
        "team_id": resolved_team_id,
        "source": "football-data.org" if players else "unavailable",
        "items": players,
        "warning": None if players else "API key missing/limited or no player data found for this team.",
    }


@router.get("/players/{player_id}/detail")
def get_player_detail(
    player_id: int,
    request: Request,
    league: str | None = Query(default=None),
    team_name: str | None = Query(default=None),
    team_id: int | None = Query(default=None),
    _role: str = Depends(require_role("user")),
):
    if league and league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail=f"Unsupported league '{league}'.")

    detail = request.app.state.football_client.get_player_detail(player_id)

    if not detail:
        resolved_team_id = None
        if league and team_name:
            resolved_team_id = _resolve_team_id(
                request=request,
                league=league,
                team_name=team_name,
                provided_team_id=team_id,
            )
        elif team_id:
            resolved_team_id = team_id

        if resolved_team_id:
            players = request.app.state.football_client.get_team_players(resolved_team_id)
            detail = next((player for player in players if player.get("id") == player_id), {})

    if detail and league and not detail.get("league"):
        detail["league"] = league
    if detail and team_name and not detail.get("team_name"):
        detail["team_name"] = team_name

    return {
        "item": detail or {"id": player_id},
        "warning": None if detail else "Player detail unavailable from current data source.",
    }


@router.post("/players/{player_name}/view")
def track_player_view(
    player_name: str,
    request: Request,
    league: str | None = Query(default=None),
    team_name: str | None = Query(default=None),
    _role: str = Depends(require_role("user")),
):
    request.app.state.analytics.track_player_view(
        player_name=player_name,
        team_name=team_name,
        league=league,
        user_id=_request_user_id(request),
    )
    return {"status": "tracked"}

