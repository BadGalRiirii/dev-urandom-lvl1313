import os
import hmac
import time
from collections import defaultdict
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

router = APIRouter()
security = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET environment variable is not set — refusing to start")

ALGORITHM    = "HS256"
EXPIRE_HOURS = 24

# ── Brute-force protection ───────────────────────────────────────────────────
_attempts: dict[str, list[float]] = defaultdict(list)
MAX_ATTEMPTS    = 5
WINDOW_SECONDS  = 900   # 15 minutes


def _check_rate_limit(ip: str) -> None:
    now     = time.monotonic()
    cutoff  = now - WINDOW_SECONDS
    bucket  = _attempts[ip]
    _attempts[ip] = [t for t in bucket if t > cutoff]
    if len(_attempts[ip]) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Try again in 15 minutes.",
            headers={"Retry-After": str(WINDOW_SECONDS)},
        )
    _attempts[ip].append(now)


class LoginRequest(BaseModel):
    password: str


def create_token() -> str:
    expire = datetime.utcnow() + timedelta(hours=EXPIRE_HOURS)
    return jwt.encode({"exp": expire, "sub": "admin"}, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(creds: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/admin/login")
async def login(body: LoginRequest, request: Request):
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if not admin_password:
        raise HTTPException(status_code=500, detail="Admin password not configured")

    ip = request.client.host if request.client else "unknown"
    _check_rate_limit(ip)

    # Constant-time comparison — prevents timing attacks
    if not hmac.compare_digest(body.password, admin_password):
        raise HTTPException(status_code=401, detail="Incorrect password")

    return {"access_token": create_token(), "token_type": "bearer"}
