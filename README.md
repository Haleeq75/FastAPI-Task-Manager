# FastAPI Task Manager

A beginner-friendly full-stack task manager app where **FastAPI serves both the API and the frontend UI** from one project.

- Backend: FastAPI + SQLAlchemy + JWT auth
- Frontend: React (served as static files by FastAPI)
- Database: PostgreSQL (default)

---

## What this app does

- Register and log in users
- Issue JWT access tokens
- Create, list, update, and delete tasks
- Ensure users can only access their own tasks
- Serve the frontend and backend from the same domain (helps avoid CORS headaches)

---

## Project structure

```text
.
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers (/register, /login, /tasks)
│   │   ├── core/         # App settings and security helpers
│   │   ├── db/           # Database session setup
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic request/response schemas
│   │   ├── static/       # React UI (index.html, app.js, config.js, styles.css)
│   │   └── main.py       # FastAPI app entrypoint
│   ├── requirements.txt
│   └── tests/
├── tests/
├── requirements.txt
└── README.md
```

---

## Prerequisites

- Python 3.10+
- PostgreSQL 14+ (or any supported local version)
- `pip`

Optional but helpful:
- `git`
- `curl` (for API smoke tests)

---

## 1) Clone and enter the project

```bash
git clone <your-repo-url>
cd FastAPI-Task-Manager-New
```

---

## 2) Create and activate a virtual environment

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### Windows (PowerShell)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Windows (Command Prompt)

```bat
python -m venv .venv
.venv\Scripts\activate.bat
```

---

## 3) Install dependencies

```bash
pip install -r requirements.txt
pip install -r backend/requirements.txt
```

---

## 4) Configure environment variables

The app can read values from environment variables or a `.env` file.

Create a `.env` in the project root (recommended):

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/task_manager
JWT_SECRET_KEY=change-this-in-production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

> Note: `DATABASE_URL` may also use `postgresql://...`; the app normalizes it automatically.

### PostgreSQL quick setup notes

- Create a DB named `task_manager`.
- Ensure your username/password in `DATABASE_URL` are correct.
- Ensure PostgreSQL is running on the host/port from the URL.

---

## 5) Run the app

```bash
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

Open in browser:
- App UI: `http://127.0.0.1:8000/`
- Swagger docs: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

---

## 6) How frontend/API routing works

The frontend is served from `backend/app/static` and mounted at `/` by FastAPI.

That means the browser calls the API with same-origin paths like:
- `/register`
- `/login`
- `/tasks`

So you usually **do not need CORS changes** for normal usage in this setup.

---

## 7) Run tests

### API tests

```bash
pytest backend/tests/test_api.py -q
```

### Other tests

```bash
pytest tests/test_config.py -q
```

If you run all tests at once and see an import mismatch about duplicate `test_config.py` names, run the two commands above separately.

---

## 8) API smoke test (optional)

### macOS / Linux (bash/zsh)

```bash
curl -X POST http://127.0.0.1:8000/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password123"}'

TOKEN=$(curl -s -X POST http://127.0.0.1:8000/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"password123"}' | jq -r .access_token)

curl -X POST http://127.0.0.1:8000/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"My task","description":"demo"}'
```

### Windows PowerShell

```powershell
$registerBody = @{ email = "alice@example.com"; password = "password123" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/register" -ContentType "application/json" -Body $registerBody

$loginBody = @{ email = "alice@example.com"; password = "password123" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/login" -ContentType "application/json" -Body $loginBody

$taskBody = @{ title = "My task"; description = "demo" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/tasks" -Headers @{ Authorization = "Bearer $($login.access_token)" } -ContentType "application/json" -Body $taskBody
```

---

## Troubleshooting

- **`connection refused` to PostgreSQL**: Verify PostgreSQL is running and your `DATABASE_URL` is correct.
- **JWT warning in tests**: Increase `JWT_SECRET_KEY` length (32+ chars recommended for HS256).
- **Frontend not loading**: Confirm app is running and visit `http://127.0.0.1:8000/` (not a separate frontend port).

---

## Deployment note (Render or similar)

Because FastAPI serves both API + frontend, deploy a single web service.

Typical start command:

```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

Set environment variables (`DATABASE_URL`, `JWT_SECRET_KEY`, etc.) in your platform dashboard.
