"""FastAPI dependencies."""

from fastapi import Header, HTTPException, status

from .config import ALLOWED_ROLES


def require_role(expected_role: str):
    def _checker(x_role: str = Header(default="user", alias="X-Role")) -> str:
        if x_role not in ALLOWED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role '{x_role}'. Allowed roles: {sorted(ALLOWED_ROLES)}",
            )
        if x_role != expected_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Endpoint requires role '{expected_role}'.",
            )
        return x_role

    return _checker
