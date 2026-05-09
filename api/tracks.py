import os
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from supabase import create_client
from api.auth import verify_token

router = APIRouter()


def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


@router.get("/tracks")
async def list_tracks():
    sb = get_supabase()
    res = sb.table("tracks").select("*").order("created_at", desc=True).execute()
    tracks = res.data
    # Attach public URLs
    for t in tracks:
        signed = sb.storage.from_("music").create_signed_url(t["file_path"], 86400)
        t["url"] = signed.get("signedURL") or signed.get("signedUrl", "")
    return tracks


@router.post("/upload/track")
async def upload_track(
    file: UploadFile = File(...),
    title: str = Form(...),
    artist: str = Form(""),
    cover_color: str = Form("#e6b400"),
    _: str = Depends(verify_token),
):
    sb = get_supabase()
    content = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower()
    file_path = f"{uuid.uuid4()}.{ext}"
    try:
        sb.storage.from_("music").upload(file_path, content, {"content-type": file.content_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")
    record = {"title": title, "artist": artist, "file_path": file_path, "cover_color": cover_color}
    try:
        res = sb.table("tracks").insert(record).execute()
        return res.data[0]
    except Exception as e:
        sb.storage.from_("music").remove([file_path])
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(e)}")


@router.delete("/tracks/{track_id}")
async def delete_track(track_id: str, _: str = Depends(verify_token)):
    sb = get_supabase()
    res = sb.table("tracks").select("file_path").eq("id", track_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Track not found")
    try:
        sb.storage.from_("music").remove([res.data["file_path"]])
    except Exception:
        pass
    sb.table("tracks").delete().eq("id", track_id).execute()
    return {"ok": True}
