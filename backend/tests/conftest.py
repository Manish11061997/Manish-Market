"""Shared fixtures for the Manish Market Pro Terminal backend test suite."""
import os

os.environ.setdefault("CONTROL_TOKEN", "test-token-123")

import pytest


@pytest.fixture()
def token():
    return os.environ["CONTROL_TOKEN"]


@pytest.fixture()
def auth_headers(token):
    return {"X-Control-Token": token}


@pytest.fixture()
def client():
    """TestClient if httpx is available; otherwise None and tests use direct calls."""
    try:
        from fastapi.testclient import TestClient
        from app import app
        return TestClient(app)
    except Exception:
        pytest.skip("fastapi TestClient unavailable (httpx not installed)")


@pytest.fixture()
def client_factory():
    """Fresh TestClient per call (bypasses module-level rate-bucket state)."""
    def _make():
        from fastapi.testclient import TestClient
        from app import app
        return TestClient(app)
    return _make
