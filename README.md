# code4trees — Vue 3 + FastAPI

Umbau von statischem HTML/JS + PHP auf:
- **Frontend:** Vue 3 (Vite, SFCs, Vue Router) — Styles 1:1 übernommen
- **Backend:** Python + FastAPI (ersetzt `api.php`)

## Struktur

```
frontend/   Vue-App (wird gebaut und per SFTP auf IONOS deployed)
backend/    FastAPI-Server (läuft auf eigenem Server, siehe backend/README.md)
```

## Entwicklung

Terminal 1 — Backend:
```bash
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

Terminal 2 — Frontend:
```bash
cd frontend && npm install && npm run dev
```

→ http://localhost:5173 — der Vite-Dev-Server proxied `/api` automatisch
auf das Backend (Port 8000), kein CORS-Gefrickel in der Entwicklung.

## Deployment

- **Frontend:** GitHub Actions baut die App (`npm run build`) und deployed
  `frontend/dist/` wie bisher per SFTP. Neues Secret nötig: `VITE_API_BASE`
  mit der öffentlichen Backend-URL (z. B. `https://api.code4trees.org/api`).
- **Backend:** läuft auf deinem Server, siehe `backend/README.md`.

## Wichtige Änderungen gegenüber der alten Version

1. **PHP → FastAPI:** Zähler, Rate-Limiting (10/h/IP) und `records.json`
   sind portiert. Die Zip-Validierung passiert jetzt zusätzlich serverseitig.
2. **Fake-Traffic ins Backend verlagert:** Der offene `?add=N`-Endpoint ist
   weg (den konnte vorher jeder aufrufen und beliebig Bäume hinzufügen!).
   Die zufälligen Inkremente laufen jetzt als Background-Task im Server.
3. **Impressum/Datenschutz** liegen unverändert als statische Dateien in
   `frontend/public/` und sind unter `/impressum.html` bzw.
   `/datenschutz.html` erreichbar.
4. **SPA-Routing:** `/` = Dashboard, `/arena` = Code-Arena. Damit Deep-Links
   auf `/arena` am IONOS-Webspace funktionieren, liegt eine `.htaccess` in
   `frontend/public/`, die alle Routen auf `index.html` rewritet.
