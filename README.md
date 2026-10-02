# HackNation

HackNation is a TypeScript web workspace for WhatsApp operations, Kanban task management, and Instagram account automation.

## Architecture

```text
React + Vite + TypeScript frontend
                |
                v
Express + TypeScript API (:3000)
        |              |              |
        v              v              v
    SQLite       Go WhatsApp      Python Instagram
                 service :8080    service :8090
```

### Frontend

- React 19
- Vite
- TypeScript
- React Router
- Native `fetch`
- Browser WebSocket for WhatsApp realtime updates

The frontend lives in `frontend/` and is served by Vite during development or Nginx in Docker.

### API

- Node.js
- Express
- TypeScript
- Native Node SQLite (`node:sqlite`)
- Supertest and Node's test runner

The API lives in `api/` and provides:

- `GET /health`
- `/api/v1/kanban/tasks`
- `/api/v1/instagram/account`
- `/api/v1/whatsapp`

The API uses `database/database.sqlite` by default. Set `DATABASE_PATH` to use another database file.

### Existing microservices

- `Whatsapp-service/`: Go service using `whatsmeow`, WebSocket, QR generation, and SQLite session/message storage.
- `instagramApi/`: Python service using FastAPI, Uvicorn, and `instagrapi`.

## Local development

Install dependencies:

```bash
cd api && npm install
cd ../frontend && npm install
```

Start the API:

```bash
cd api
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

The frontend expects the API at `http://localhost:3000`. Override it with `VITE_API_URL`.

## Validation

```bash
cd api
npm test
npm run build

cd ../frontend
npm run typecheck
npm run build
```

## Docker Compose

The compose file defines:

- `frontend` on port `3001`
- `api` on port `3000`
- `whatsapp-service` on port `8080`
- `instagram-service` on port `8090`

Run the full stack with:

```bash
docker compose up --build
```

The Docker daemon must be running before executing this command.
