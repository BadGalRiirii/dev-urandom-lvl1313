import os
import uuid
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from supabase import create_client
from api.auth import verify_token

router = APIRouter()


def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


@router.get("/books")
async def list_books():
    sb = get_supabase()
    res = sb.table("books").select("*").order("created_at", desc=True).execute()
    return res.data


@router.get("/books/{book_id}")
async def get_book(book_id: str):
    sb = get_supabase()
    res = sb.table("books").select("*").eq("id", book_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Book not found")
    book = res.data
    # Generate signed URL
    signed = sb.storage.from_("books").create_signed_url(book["file_path"], 86400)
    book["signed_url"] = signed.get("signedURL") or signed.get("signedUrl", "")
    return book


@router.post("/upload/book")
async def upload_book(
    file: UploadFile = File(...),
    title: str = Form(...),
    author: str = Form(""),
    cover_color: str = Form("#e6b400"),
    _: str = Depends(verify_token),
):
    sb = get_supabase()
    content = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower()
    file_path = f"{uuid.uuid4()}.{ext}"
    try:
        sb.storage.from_("books").upload(file_path, content, {"content-type": file.content_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")
    record = {"title": title, "author": author, "file_path": file_path,
              "file_type": ext, "cover_color": cover_color}
    try:
        res = sb.table("books").insert(record).execute()
        return res.data[0]
    except Exception as e:
        sb.storage.from_("books").remove([file_path])
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")


@router.delete("/books/{book_id}")
async def delete_book(book_id: str, _: str = Depends(verify_token)):
    sb = get_supabase()
    res = sb.table("books").select("file_path").eq("id", book_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Book not found")
    try:
        sb.storage.from_("books").remove([res.data["file_path"]])
    except Exception:
        pass
    sb.table("books").delete().eq("id", book_id).execute()
    return {"ok": True}


@router.get("/epub/parse/{book_id}")
async def parse_epub(book_id: str):
    sb = get_supabase()
    res = sb.table("books").select("*").eq("id", book_id).single().execute()
    if not res.data or res.data.get("file_type") != "epub":
        raise HTTPException(400, "Not an epub")
    return {"id": book_id, "title": res.data.get("title"), "author": res.data.get("author")}
