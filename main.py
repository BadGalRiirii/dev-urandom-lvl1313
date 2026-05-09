import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.auth import router as auth_router
from api.books import router as books_router
from api.tracks import router as tracks_router
from api.posts import router as posts_router

app = FastAPI(title="riri/dev/urandom API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(books_router, prefix="/api")
app.include_router(tracks_router, prefix="/api")
app.include_router(posts_router, prefix="/api")


@app.get("/")
def root():
    return {"status": "running", "site": "riri/dev/urandom/lvl1313"}
