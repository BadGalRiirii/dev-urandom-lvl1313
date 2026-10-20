"""Put a backup made by scripts/backup.py back into Supabase.

    npm run restore -- supa-backup/2026-10-21

Only rows that are MISSING are added (matched by id) — existing rows are never
changed or deleted, so dates like posts.updated_at stay exactly as backed up.
Files are re-uploaded. On a brand-new project, run supabase/schema.sql in the SQL
editor and create the three public buckets first.
"""
import json
import mimetypes
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT  = Path(__file__).resolve().parent.parent
ORDER = ["books", "highlights", "posts", "site_settings", "tracks"]   # books before highlights (foreign key)

if len(sys.argv) != 2:
    sys.exit("Usage: npm run restore -- supa-backup/<date>")
src = Path(sys.argv[1])
if not src.is_absolute():
    src = ROOT / src
if not (src / "tables").is_dir():
    sys.exit(f"{src} doesn't look like a backup folder (no tables/ inside)")

env = {}
for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip('"')
URL = env.get("SUPABASE_URL", "").rstrip("/")
KEY = env.get("SUPABASE_SERVICE_KEY", "")
if not URL or not KEY:
    sys.exit("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")

answer = input(f"Restore {src.name} into {URL}? Missing rows and files are added; existing rows are left alone. [y/N] ")
if answer.strip().lower() != "y":
    sys.exit("Cancelled.")


def send(method, path, data, headers):
    req = urllib.request.Request(URL + path, data=data, method=method,
                                 headers={"apikey": KEY, "Authorization": f"Bearer {KEY}", **headers})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.status


for table in ORDER:
    f = src / "tables" / f"{table}.json"
    if not f.exists():
        continue
    rows = json.loads(f.read_text(encoding="utf-8"))
    if rows:
        send("POST", f"/rest/v1/{table}?on_conflict=id", json.dumps(rows).encode(),
             {"Content-Type": "application/json", "Prefer": "resolution=ignore-duplicates,return=minimal"})
    print(f"  {table}: {len(rows)} rows")

storage = src / "storage"
if storage.is_dir():
    for bucket_dir in sorted(p for p in storage.iterdir() if p.is_dir()):
        files = [p for p in bucket_dir.rglob("*") if p.is_file()]
        for p in files:
            name = p.relative_to(bucket_dir).as_posix()
            ctype = mimetypes.guess_type(name)[0] or "application/octet-stream"
            if name.endswith(".epub"):
                ctype = "application/epub+zip"
            send("POST", f"/storage/v1/object/{bucket_dir.name}/{urllib.parse.quote(name)}", p.read_bytes(),
                 {"Content-Type": ctype, "x-upsert": "true"})
        print(f"  {bucket_dir.name}: {len(files)} files")

print("Restore finished.")
