import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from api.auth   import router as auth_router
from api.books  import router as books_router
from api.tracks import router as tracks_router
from api.posts  import router as posts_router, get_supabase

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

# Uploads are capped at 50 MB (Supabase free plan); refuse anything much bigger before
# reading it, so nobody can tie up the small Render instance without even logging in.
MAX_BODY_BYTES = 55 * 1024 * 1024


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
            return JSONResponse({"detail": "File too large (max 50 MB)"}, status_code=413)
        return await call_next(request)


app.add_middleware(BodySizeLimitMiddleware)

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


# HEAD too: Render's own health checks use it
@app.api_route("/", methods=["GET", "HEAD"])
def root():
    return {"status": "ok"}


# Pinged by the keep-alive workflow (.github/workflows/keep-alive.yml) and on
# every page load. Touching the DB counts as Supabase activity, so one ping
# keeps both the Render service and the Supabase project awake. A database
# outage returns 503, which fails the workflow — GitHub then emails the owner.
@app.get("/api/health")
def health():
    try:
        get_supabase().table("posts").select("id").limit(1).execute()
        return {"status": "ok", "db": "ok"}
    except Exception:
        return JSONResponse({"status": "degraded", "db": "unreachable"}, status_code=503)
