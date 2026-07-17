# code4trees Backend (FastAPI)

Portierung des alten `api.php` auf Python + FastAPI.

## Lokal starten

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows (Linux: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Endpoints:
- `GET  /api/trees`  → `{"trees": 1234}`
- `POST /api/submit` → multipart/form-data mit `name`, `project`, `zipfile`

Der Fake-Traffic (zufällige Baum-Inkremente alle 15 s) läuft jetzt als
Background-Task direkt im Backend — kein `?add=`-Endpoint mehr, den jeder
von außen aufrufen könnte.

## Produktiv-Betrieb (Server)

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Empfohlen: hinter nginx als Reverse-Proxy betreiben und als systemd-Service
einrichten (analog zum Discord-Bot-Setup), z. B.:

```ini
# /etc/systemd/system/code4trees-api.service
[Unit]
Description=code4trees FastAPI Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/code4trees/backend
ExecStart=/opt/code4trees/backend/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

nginx leitet dann `https://api.code4trees.org/api/...` (oder `code4trees.org/api/...`)
auf `127.0.0.1:8000` weiter.

**Wichtig:** In `main.py` `ALLOWED_ORIGINS` auf die echte Frontend-Domain
einschränken (z. B. `["https://code4trees.org"]`).

Hinweis: Der Zähler liegt als Datei in `data/` (wie vorher `tree_count.txt`
beim PHP-Backend). Das funktioniert mit einem einzelnen uvicorn-Prozess;
bei mehreren Workern müsste man auf SQLite/Redis umstellen.
