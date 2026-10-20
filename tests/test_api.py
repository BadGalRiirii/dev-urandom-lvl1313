"""Backend checks that need no database or network — run in CI on every push.

    pip install -r requirements.txt pytest
    pytest -q
"""
import os

os.environ.setdefault("JWT_SECRET", "test-secret-not-used-in-production")
os.environ["ADMIN_PASSWORD"] = "correct horse battery"

import pytest
from fastapi.testclient import TestClient

import main
from api import auth

client = TestClient(main.app)


@pytest.fixture(autouse=True)
def reset_rate_limits():
    auth._failures.clear()
    auth._global_failures.clear()


def login(password, ip="203.0.113.1"):
    return client.post("/api/admin/login", json={"password": password},
                       headers={"X-Forwarded-For": ip})


def test_root_answers_get_and_head():
    assert client.get("/").status_code == 200
    assert client.head("/").status_code == 200


def test_security_headers():
    r = client.get("/")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "DENY"


def test_api_docs_are_hidden():
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert client.get(path).status_code == 404


def test_correct_password_gets_a_token():
    r = login("correct horse battery")
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_successful_logins_never_lock_you_out():
    assert all(login("correct horse battery").status_code == 200 for _ in range(10))


def test_wrong_passwords_lock_out_that_address_only():
    codes = [login("nope", ip="198.51.100.7").status_code for _ in range(6)]
    assert codes == [401] * 5 + [429]
    assert login("correct horse battery", ip="198.51.100.7").status_code == 429
    assert login("correct horse battery", ip="198.51.100.8").status_code == 200


def test_global_cap_stops_guessers_rotating_addresses():
    for i in range(auth.MAX_GLOBAL_ATTEMPTS):
        login("nope", ip=f"192.0.2.{i % 250}")
    assert login("nope", ip="192.0.2.251").status_code == 429


def test_non_ascii_password_is_rejected_not_crashed():
    assert login("pässwörd").status_code == 401


@pytest.mark.parametrize("method,path", [
    ("get", "/api/admin/posts"),
    ("post", "/api/posts"),
    ("put", "/api/posts/1"),
    ("delete", "/api/posts/1"),
    ("delete", "/api/books/1"),
    ("delete", "/api/tracks/1"),
    ("post", "/api/upload/post-image"),
    ("post", "/api/upload/book"),
    ("post", "/api/upload/track"),
])
def test_admin_routes_need_a_token(method, path):
    assert getattr(client, method)(path).status_code in (401, 403)


def test_forged_token_is_refused():
    r = client.get("/api/admin/posts", headers={"Authorization": "Bearer not.a.real-token"})
    assert r.status_code == 401


def test_oversized_upload_refused_before_reading():
    r = client.post("/api/upload/book", content=b"",
                    headers={"Content-Length": str(60 * 1024 * 1024),
                             "Content-Type": "application/octet-stream"})
    assert r.status_code == 413
