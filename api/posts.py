import os
from fastapi import APIRouter, HTTPException, Depends
from supabase import create_client
from pydantic import BaseModel
from typing import Optional
from api.auth import verify_token

router = APIRouter()


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
    res = sb.table("posts").select("*").eq("id", post_id).single().execute()
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
