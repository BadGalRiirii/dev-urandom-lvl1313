import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from api.auth   import router as auth_router
from api.books  import router as books_router
from api.tracks import router as tracks_router
from api.posts  import router as posts_router

# Disable all documentation endpoints — never expose the API surface publicly
app = FastAPI(
    title="riri/dev/urandom API",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"]    = "nosniff"
        response.headers["X-Frame-Options"]           = "DENY"
        response.headers["X-XSS-Protection"]         = "1; mode=block"
        response.headers["Referrer-Policy"]           = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"]        = "camera=(), microphone=(), geolocation=()"
        return response


app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router,   prefix="/api")
app.include_router(books_router,  prefix="/api")
app.include_router(tracks_router, prefix="/api")
app.include_router(posts_router,  prefix="/api")


@app.get("/")
def root():
    return {"status": "ok"}
