"""Back up every table and stored file to supa-backup/<date>/.

    npm run backup

Uses SUPABASE_URL and SUPABASE_SERVICE_KEY from .env. The folder is gitignored —
copy it somewhere safe (cloud drive, USB) now and then.
"""
import json
import sys
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT    = Path(__file__).resolve().parent.parent
TABLES  = ["books", "highlights", "posts", "site_settings", "tracks"]
BUCKETS = ["books", "music", "post-images"]


def load_env():
    env = {}
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"')
    return env


env  = load_env()
URL  = env.get("SUPABASE_URL", "").rstrip("/")
KEY  = env.get("SUPABASE_SERVICE_KEY", "")
if not URL or not KEY:
    sys.exit("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
AUTH = {"apikey": KEY, "Authorization": f"Bearer {KEY}"}


def request(path, body=None):
    headers = dict(AUTH)
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(URL + path, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def list_files(bucket, prefix=""):
    """Every file in a bucket, walking into folders."""
    files, offset = [], 0
    while True:
        page = json.loads(request(f"/storage/v1/object/list/{bucket}",
                                  {"prefix": prefix, "limit": 1000, "offset": offset}))
        for item in page:
            path = f"{prefix}{item['name']}"
            if item.get("id") is None:          # a folder
                files += list_files(bucket, path + "/")
            else:
                files.append(path)
        if len(page) < 1000:
            return files
        offset += 1000


out = ROOT / "supa-backup" / date.today().isoformat()
(out / "tables").mkdir(parents=True, exist_ok=True)

for table in TABLES:
    rows = json.loads(request(f"/rest/v1/{table}?select=*"))
    (out / "tables" / f"{table}.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  {table}: {len(rows)} rows")

total = 0
for bucket in BUCKETS:
    names = list_files(bucket)
    for name in names:
        dest = out / "storage" / bucket / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(request(f"/storage/v1/object/{bucket}/{urllib.parse.quote(name)}"))
    total += len(names)
    print(f"  {bucket}: {len(names)} files")

print(f"Backup saved to {out}  ({total} files)")
