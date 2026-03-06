import os
import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure repo root is importable when tests are invoked from inside `backend/`.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Ensure app settings load a dedicated SQLite database for tests.
os.environ["DATABASE_URL"] = "sqlite:///./test_task_manager.db"

from backend.app.db.session import engine
from backend.app.main import app
from backend.app.models import Base


@pytest.fixture(autouse=True)
def test_db() -> Generator[None, None, None]:
    """Create a clean test database for each test and tear it down afterwards."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    try:
        yield
    finally:
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
