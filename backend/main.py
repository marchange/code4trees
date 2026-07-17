"""
code4trees Backend — FastAPI

Portierung von public/api/api.php:
  - GET  /api/trees   → aktueller Baum-Zähler
  - POST /api/submit  → Projekt-Einreichung (Zip-Validierung, Zähler +1, Record speichern)
  - Rate-Limiting: max. 10 Schreib-Requests pro IP pro Stunde
  - NEU: Fake-Traffic (zufällige Baum-Inkremente) läuft jetzt als Background-Task
    im Backend statt als fetch-Loop im Frontend.

Start (Entwicklung):
    uvicorn main:app --reload --port 8000
"""

import asyncio
import io
import json
import random
import secrets
import time
import zipfile
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, File, Form, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# --------------------------------------------------------------------------
# Konfiguration
# --------------------------------------------------------------------------

DATA_DIR = Path(__file__).parent / "data"
TREE_COUNT_FILE = DATA_DIR / "tree_count.txt"
RECORDS_FILE = DATA_DIR / "records.json"

MAX_REQUESTS_PER_HOUR = 10          # Max. Schreib-Requests pro IP pro Stunde (danke alex)
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB wie im Frontend

# Fake-Traffic (aus dem Frontend hierher verlagert)
RANDOM_ADD_INTERVAL_S = 15   # alle 15 Sekunden ein Versuch
RANDOM_ADD_SKIP_CHANCE = 0.2  # 20 % Chance auszusetzen → wirkt organischer
RANDOM_ADD_MIN, RANDOM_ADD_MAX = 1, 7

# Dateiendungen, die ein Zip als "echtes Projekt" qualifizieren
# (identisch zum Client-Check in SubmitForm.vue)
VALID_PROJECT_SUFFIXES = (
    "readme.md", ".js", ".py", ".html", ".css",
    ".java", ".cpp", ".c", ".cs", ".json",
)

# In Produktion auf die echte(n) Frontend-Domain(s) einschränken!
ALLOWED_ORIGINS = ["*"]

# --------------------------------------------------------------------------
# App & State
# --------------------------------------------------------------------------

from contextlib import asynccontextmanager


@asynccontextmanager
async def _lifespan(app: FastAPI):
    _ensure_data_files()
    task = asyncio.create_task(_random_growth_loop())
    yield
    task.cancel()


app = FastAPI(title="code4trees API", version="2.0.0", lifespan=_lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Ein Lock genügt, da uvicorn standardmäßig single-process läuft.
# (Bei mehreren Workern müsste der Zähler in eine DB wie SQLite/Redis.)
_state_lock = asyncio.Lock()

# Rate-Limits in-memory: {"ip:YYYY-mm-dd-HH": count}
_rate_limits: dict[str, int] = {}


# --------------------------------------------------------------------------
# Persistenz-Helfer
# --------------------------------------------------------------------------

def _ensure_data_files() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not TREE_COUNT_FILE.exists():
        TREE_COUNT_FILE.write_text("0")
    if not RECORDS_FILE.exists():
        RECORDS_FILE.write_text("[]")


def _read_count() -> int:
    try:
        return int(TREE_COUNT_FILE.read_text().strip() or 0)
    except (ValueError, OSError):
        return 0


def _write_count(count: int) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    TREE_COUNT_FILE.write_text(str(count))


def _append_record(record: dict) -> None:
    try:
        records = json.loads(RECORDS_FILE.read_text() or "[]")
    except (json.JSONDecodeError, OSError):
        records = []
    records.append(record)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RECORDS_FILE.write_text(json.dumps(records, indent=2, ensure_ascii=False))


# --------------------------------------------------------------------------
# Rate-Limiting (Portierung von check_rate_limit aus api.php)
# --------------------------------------------------------------------------

def _check_rate_limit(ip: str) -> bool:
    """True = Request erlaubt, False = Limit überschritten."""
    current_hour = datetime.now().strftime("%Y-%m-%d-%H")
    key = f"{ip}:{current_hour}"

    current_count = _rate_limits.get(key, 0)
    if current_count >= MAX_REQUESTS_PER_HOUR:
        return False

    _rate_limits[key] = current_count + 1

    # Alte Einträge (> 24 h) aufräumen, damit das Dict nicht unbegrenzt wächst
    cutoff = time.time() - 24 * 3600
    for k in list(_rate_limits):
        try:
            _, stored_hour = k.rsplit(":", 1)
            stored_ts = datetime.strptime(stored_hour, "%Y-%m-%d-%H").timestamp()
            if stored_ts < cutoff:
                del _rate_limits[k]
        except ValueError:
            del _rate_limits[k]

    return True


def _client_ip(request: Request) -> str:
    # Hinter einem Reverse-Proxy (nginx) den echten Client aus dem Header nehmen
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# --------------------------------------------------------------------------
# Zip-Validierung (serverseitiges Pendant zum JSZip-Check im Frontend)
# --------------------------------------------------------------------------

def _validate_zip(data: bytes) -> tuple[bool, str]:
    """Prüft, ob der Upload ein echtes, nicht-leeres Projekt-Zip ist."""
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            names = zf.namelist()

            if not names:
                return False, "Das Zip-Archiv ist leer!"

            has_valid_file = any(
                not name.endswith("/")
                and name.lower().endswith(VALID_PROJECT_SUFFIXES)
                for name in names
            )
            if not has_valid_file:
                return False, (
                    "Kein gültiges Projekt! Das Zip muss mindestens eine "
                    "Projektdatei enthalten (z. B. README.md, .js, .py, .html, .java)."
                )
    except zipfile.BadZipFile:
        return False, "Die Zip-Datei konnte nicht gelesen werden (eventuell beschädigt)."

    return True, "OK"


def _generate_tree_id() -> str:
    # Format wie in api.php: TREE-XXXXXXXX-XXXX
    return f"TREE-{secrets.token_hex(4).upper()}-{secrets.token_hex(2).upper()}"


# --------------------------------------------------------------------------
# Fake-Traffic Background-Task (aus dem Frontend verlagert)
# --------------------------------------------------------------------------

async def _random_growth_loop() -> None:
    """Erhöht den Zähler in zufälligen Schritten — simuliert Live-Aktivität."""
    while True:
        await asyncio.sleep(RANDOM_ADD_INTERVAL_S)

        # 20 % Chance auszusetzen, wirkt organischer
        if random.random() < RANDOM_ADD_SKIP_CHANCE:
            continue

        random_trees = random.randint(RANDOM_ADD_MIN, RANDOM_ADD_MAX)
        async with _state_lock:
            _write_count(_read_count() + random_trees)




# --------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------

@app.get("/api/trees")
async def get_trees() -> dict:
    """Lese-Modus: nur den aktuellen Stand liefern (Pendant zu GET api.php)."""
    async with _state_lock:
        return {"trees": _read_count()}


@app.post("/api/submit")
async def submit_project(
    request: Request,
    name: str = Form("Anonymous"),
    project: str = Form("Project"),
    zipfile_upload: UploadFile = File(..., alias="zipfile"),
):
    """Schreib-Modus: Einreichung validieren, Baum pflanzen, Record speichern."""

    # --- Rate-Limit prüfen (wie in api.php vor Schreib-Operationen) ---
    ip = _client_ip(request)
    if not _check_rate_limit(ip):
        return JSONResponse(
            status_code=429,
            content={
                "status": "error",
                "message": f"Rate limit exceeded. Maximum {MAX_REQUESTS_PER_HOUR} requests per hour per IP.",
                "retry_after": 3600,
            },
        )

    # --- Upload lesen & begrenzen ---
    data = await zipfile_upload.read()
    if len(data) > MAX_UPLOAD_BYTES:
        return JSONResponse(
            status_code=413,
            content={"status": "error", "message": "Datei größer als 50 MB."},
        )

    # --- Zip serverseitig validieren ---
    valid, message = _validate_zip(data)
    if not valid:
        return JSONResponse(
            status_code=422,
            content={"status": "error", "message": message},
        )

    # --- KI-Prüfung simulieren (sleep(2) aus api.php) ---
    await asyncio.sleep(2)

    # --- Zähler erhöhen + Record speichern (atomar unter Lock) ---
    tree_id = _generate_tree_id()
    async with _state_lock:
        count = _read_count() + 1
        _write_count(count)
        _append_record({
            "tree_id": tree_id,
            "name": name.strip()[:100] or "Anonymous",
            "project": project.strip()[:200] or "Project",
            "date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        })

    return {
        "status": "success",
        "message": "Project validated! Tree planted.",
        "trees": count,
        "newCount": count,
        "treeId": tree_id,
    }
