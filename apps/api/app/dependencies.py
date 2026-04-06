"""FastAPI dependencies."""

from __future__ import annotations

from fastapi import Header, HTTPException, Request, status

from .config import ALLOWED_ROLES


def require_role(expected_role: str):
    if expected_role not in ALLOWED_ROLES:
        raise ValueError(f"Invalid expected role '{expected_role}'.")

    allowed_by_endpoint = {
        "user": {"user", "data_scientist", "admin"},
        "data_scientist": {"data_scientist", "admin"},
        "admin": {"admin"},
    }

    allowed_roles = allowed_by_endpoint[expected_role]

    def _checker(
        request: Request,
        x_user_id: str | None = Header(default=None, alias="X-User-Id"),
    ) -> str:
        user_id = (x_user_id or "").strip()
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing X-User-Id.",
            )

        user = request.app.state.analytics.get_user_by_id(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unknown user. Please login first.",
            )

        role = user.get("role") or "user"
        if role not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{role}' is not allowed.",
            )

        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Endpoint requires role '{expected_role}'.",
            )

        request.state.current_user = user
        return role

    return _checker
