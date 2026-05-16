import os
import uuid
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from supabase import create_client
from pydantic import BaseModel
from typing import Optional
from api.auth import verify_token

router = APIRouter()

MAX_IMAGE_SIZE = 10 * 1024 * 1024   # 10 MB
ALLOWED_IMAGE_EXTS = {"jpg", "jpeg", "png", "gif", "webp", "avif"}


def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


class PostBody(BaseModel):
    title: str
    content: str
    category: Optional[str] = "book"
    related_title: Optional[str] = ""
    rating: Optional[int] = None
    published: Optional[bool] = True
    cover_image: Optional[str] = None


@router.get("/posts")
async def list_posts():
    sb = get_supabase()
    res = sb.table("posts").select("*").eq("published", True).order("created_at", desc=True).execute()
    return res.data


@router.get("/admin/posts")
async def list_all_posts(_: str = Depends(verify_token)):
    sb = get_supabase()
    res = sb.table("posts").select("*").order("created_at", desc=True).execute()
    return res.data


@router.get("/posts/{post_id}")
async def get_post(post_id: str):
    sb = get_supabase()
    # Only serve published posts on the public endpoint
    res = sb.table("posts").select("*").eq("id", post_id).eq("published", True).single().execute()
    if not res.data:
        raise HTTPException(404, "Post not found")
    return res.data


@router.post("/posts")
async def create_post(body: PostBody, _: str = Depends(verify_token)):
    sb = get_supabase()
    res = sb.table("posts").insert(body.dict()).execute()
    return res.data[0]


@router.put("/posts/{post_id}")
async def update_post(post_id: str, body: PostBody, _: str = Depends(verify_token)):
    sb = get_supabase()
    res = sb.table("posts").update(body.dict()).eq("id", post_id).execute()
    return res.data[0]


@router.delete("/posts/{post_id}")
async def delete_post(post_id: str, _: str = Depends(verify_token)):
    sb = get_supabase()
    sb.table("posts").delete().eq("id", post_id).execute()
    return {"deleted": True}


@router.post("/upload/post-image")
async def upload_post_image(
    file: UploadFile = File(...),
    _: str = Depends(verify_token),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(400, "Unsupported image type")

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(400, "Image too large (max 10 MB)")

    sb = get_supabase()
    path = f"{uuid.uuid4()}.{ext}"
    try:
        sb.storage.from_("post-images").upload(path, content, {"content-type": file.content_type})
    except Exception as e:
        raise HTTPException(500, f"Storage upload failed: {str(e)}")
    public = sb.storage.from_("post-images").get_public_url(path)
    return {"url": public}
