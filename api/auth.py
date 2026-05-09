import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

router = APIRouter()
security = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET", "change-this-in-production")
ALGORITHM = "HS256"
EXPIRE_HOURS = 24


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
async def login(body: LoginRequest):
    admin_password = os.getenv("ADMIN_PASSWORD", "")
    if not admin_password:
        raise HTTPException(status_code=500, detail="Admin password not configured")
    if body.password != admin_password:
        raise HTTPException(status_code=401, detail="Incorrect password")
    return {"access_token": create_token(), "token_type": "bearer"}
