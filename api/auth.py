import os
import hmac
import time
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import BaseModel

router = APIRouter()
security = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET environment variable is not set — refusing to start")

ALGORITHM    = "HS256"
EXPIRE_HOURS = 24

log = logging.getLogger("uvicorn.error")   # shows up in the Render logs

# ── Brute-force protection ───────────────────────────────────────────────────
# Only FAILED attempts count, so logging in several times a day never locks you out.
# The per-IP limit stops a single guesser; the global cap bounds anyone rotating
# addresses (or faking X-Forwarded-For) to a handful of guesses per window.
_failures: dict[str, list[float]] = defaultdict(list)
_global_failures: list[float] = []
MAX_ATTEMPTS        = 5
MAX_GLOBAL_ATTEMPTS = 50
WINDOW_SECONDS      = 900   # 15 minutes


def _client_ip(request: Request) -> str:
    # Behind Render's proxy, request.client is the proxy itself — the visitor's
    # address is the first entry of X-Forwarded-For
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _recent(times: list[float], now: float) -> list[float]:
    return [t for t in times if t > now - WINDOW_SECONDS]


def _check_rate_limit(ip: str) -> None:
    now = time.monotonic()
    _failures[ip] = _recent(_failures[ip], now)
    _global_failures[:] = _recent(_global_failures, now)
    if len(_failures[ip]) >= MAX_ATTEMPTS or len(_global_failures) >= MAX_GLOBAL_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Try again in 15 minutes.",
            headers={"Retry-After": str(WINDOW_SECONDS)},
        )


def _record_failure(ip: str) -> None:
    now = time.monotonic()
    _failures[ip].append(now)
    _global_failures.append(now)
    log.warning("Failed admin login from %s (%d in the last 15 min)", ip, len(_failures[ip]))


class LoginRequest(BaseModel):
    password: str


def create_token() -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=EXPIRE_HOURS)
    return jwt.encode({"exp": expire, "sub": "admin"}, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(creds: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/admin/login")
async def login(body: LoginRequest, request: Request):
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if not admin_password:
        raise HTTPException(status_code=500, detail="Admin password not configured")

    ip = _client_ip(request)
    _check_rate_limit(ip)

    # Constant-time comparison — prevents timing attacks
    if not hmac.compare_digest(body.password.encode(), admin_password.encode()):
        _record_failure(ip)
        raise HTTPException(status_code=401, detail="Incorrect password")

    _failures.pop(ip, None)
    log.info("Admin logged in from %s", ip)
    return {"access_token": create_token(), "token_type": "bearer"}
