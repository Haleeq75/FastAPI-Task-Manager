# FastAPI Task Manager

A full-stack task manager app with:
- a **FastAPI + SQLAlchemy backend** (`backend/`)
- a **static HTML/CSS/JS frontend** (`frontend/`)

It supports registration/login with JWT authentication and per-user task CRUD.

## Current Project Status

### ✅ Implemented
- User registration (`POST /register`) and login (`POST /login`).
- JWT-based auth (`Authorization: Bearer <token>`).
- Task create/list/get/update/delete endpoints under `/tasks`.
- Per-user task ownership checks.
- Pagination (`skip`, `limit`) and completion filtering (`completed`) on task listing.
- API tests in `backend/tests/`.

### ✅ Project Structure Cleanup
- Backend application code is now the single source of truth in `backend/app/`.
- Root `app/` is a compatibility shim that re-exports `backend.app` to avoid import conflicts.
- Database default has been migrated to PostgreSQL.

## Folder Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── app.js
│   ├── config.template.js
│   ├── config.js
│   ├── index.html
│   ├── serve.sh
│   └── styles.css
├── app/  # compatibility re-export layer
├── tests/
├── requirements.txt
└── README.md
```

## Local Setup

### 1) Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Example PostgreSQL DSN (override as needed)
export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/task_manager"

uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Docs: `http://127.0.0.1:8000/docs`

### 2) Frontend

```bash
cd frontend
cp config.template.js config.js
# edit config.js and set API_BASE_URL to your backend URL if needed
./serve.sh
```

Then open: `http://127.0.0.1:3000`

## Running Tests

Backend API tests:
```bash
cd /path/to/FastAPI-Task-Manager
pytest backend/tests
```

Root config tests:
```bash
cd /path/to/FastAPI-Task-Manager
pytest tests/test_config.py
```

## Quick API Smoke Flow

```bash
# register
curl -X POST http://127.0.0.1:8000/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password123"}'

# login
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password123"}' | jq -r .access_token)

# create task
curl -X POST http://127.0.0.1:8000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"My task","description":"demo"}'
```
