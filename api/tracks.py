import os
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from supabase import create_client
from api.auth import verify_token

router = APIRouter()

MAX_TRACK_SIZE     = 150 * 1024 * 1024   # 150 MB
ALLOWED_TRACK_EXTS = {"mp3", "wav", "ogg", "flac", "aac", "m4a"}


def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    return create_client(url, key)


@router.get("/tracks")
async def list_tracks():
    sb = get_supabase()
    res = sb.table("tracks").select("*").order("created_at", desc=True).execute()
    tracks = res.data
    if not tracks:
        return tracks

    # One batch call instead of N sequential calls — much faster
    paths = [t["file_path"] for t in tracks]
    url_map: dict[str, str] = {}
    try:
        result = sb.storage.from_("music").create_signed_urls(paths, 86400)
        # Normalize: supabase-py may return a list or a response object
        if isinstance(result, list):
            items = result
        elif hasattr(result, "data") and result.data:
            items = result.data
        elif isinstance(result, dict) and "data" in result:
            items = result["data"]
        else:
            items = []

        for r in items:
            if isinstance(r, dict):
                path = r.get("path") or r.get("file_path", "")
                url  = r.get("signedURL") or r.get("signedUrl", "")
                if path:
                    url_map[path] = url
    except Exception:
        # Fallback: generate signed URLs one at a time (slower but always works)
        for t in tracks:
            try:
                signed = sb.storage.from_("music").create_signed_url(t["file_path"], 86400)
                url_map[t["file_path"]] = signed.get("signedURL") or signed.get("signedUrl", "")
            except Exception:
                url_map[t["file_path"]] = ""

    for t in tracks:
        t["url"] = url_map.get(t["file_path"], "")
    return tracks


@router.post("/upload/track")
async def upload_track(
    file: UploadFile = File(...),
    title: str = Form(...),
    artist: str = Form(""),
    cd_image: int = Form(1),
    _: str = Depends(verify_token),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_TRACK_EXTS:
        raise HTTPException(400, "Only MP3, WAV, OGG, FLAC, AAC, and M4A files are allowed")

    content = await file.read()
    if len(content) > MAX_TRACK_SIZE:
        raise HTTPException(400, "File too large (max 150 MB)")

    sb = get_supabase()
    file_path = f"{uuid.uuid4()}.{ext}"
    try:
        sb.storage.from_("music").upload(file_path, content, {"content-type": file.content_type})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    record = {"title": title, "artist": artist, "file_path": file_path, "cover_color": f"cd:{cd_image}"}
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
