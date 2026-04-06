"""Admin analytics endpoints."""

from fastapi import APIRouter, Depends, Query, Request

from ..dependencies import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/analytics/top-teams")
def top_teams(
    request: Request,
    limit: int = Query(default=10, ge=1, le=100),
    _role: str = Depends(require_role("admin")),
):
    return {"items": request.app.state.analytics.top_teams(limit=limit)}


@router.get("/analytics/top-players")
def top_players(
    request: Request,
    limit: int = Query(default=10, ge=1, le=100),
    _role: str = Depends(require_role("admin")),
):
    return {"items": request.app.state.analytics.top_players(limit=limit)}


@router.get("/analytics/users")
def list_users(
    request: Request,
    limit: int = Query(default=100, ge=1, le=500),
    _role: str = Depends(require_role("admin")),
):
    return {"items": request.app.state.analytics.list_users(limit=limit)}


@router.get("/analytics/users/{user_id}")
def user_activity(
    user_id: str,
    request: Request,
    limit: int = Query(default=10, ge=1, le=100),
    _role: str = Depends(require_role("admin")),
):
    payload = request.app.state.analytics.user_activity(user_id=user_id, limit=limit)
    return payload
