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
