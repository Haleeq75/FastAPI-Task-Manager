"""Compatibility entrypoint for `uvicorn backend.app.main:app` from backend cwd."""

from app.main import app

__all__ = ["app"]
