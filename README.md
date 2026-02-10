# Dynamic Forms → Dynamic Charts

A React + Python FastAPI application where an Admin designs forms (fields + rules), publishes them, collects submissions, and builds charts from the collected data. A public page renders any published form dynamically from metadata.

## Tech stack

- **Frontend:** React (Vite), Tailwind CSS, React Router, Recharts
- **Backend:** Python 3.10+, FastAPI
- **Database:** MongoDB

## Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB running locally or a connection URI

## Environment variables

### Backend (`server/`)

Create `server/.env` (see `server/.env.example`):

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (default: `mongodb://localhost:27017`) |
| `DATABASE_NAME` | Database name (default: `dynamic_forms_db`) |
| `SECRET_KEY` | JWT signing secret (change in production) |
| `ALGORITHM` | JWT algorithm (default: `HS256`) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry (default: `60`) |
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g. `http://localhost:5173`) |

## Setup and run

### 1. MongoDB

Ensure MongoDB is running and reachable at `MONGODB_URI`.

### 2. Backend

```bash
cd server
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be at `http://localhost:8000`. Indexes are created on startup.

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

The app will be at `http://localhost:5173`. The dev server proxies `/api` to `http://localhost:8000`.

### 4. First user

1. Open `http://localhost:5173/register`.
2. Register with an email and password. The first user is created as **admin**.
3. Sign in and use the admin panel.

## Project structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── api.js           # API client
│   │   ├── context/         # Auth context
│   │   ├── components/      # Layout, ChartPreview
│   │   ├── pages/           # Login, Admin (FormList, FormDesigner, Submissions, ChartBuilder, Dashboard), PublicForm
│   │   └── utils/           # formRules, validation
│   └── ...
├── server/                  # FastAPI backend
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── auth.py
│   ├── models/              # Pydantic + document schemas
│   ├── routers/             # auth, forms, submissions, charts, public
│   └── services/            # validation, chart_aggregation
├── README.md
└── APPROACH.md
```

## Features

- **Admin (protected):**
  - **Form designer:** Add/edit/remove fields (text, number, select, multiselect, date, boolean), reorder, required, validations (min, max, length, regex), show/hide rules, draft → publish.
  - **Submissions:** List with server-side pagination and optional JSON filter; export current view to CSV.
  - **Chart builder:** Select form, chart type (bar, line, pie), dimension (group-by), measure and aggregation, optional time bucketing (day/week/month) on a date field; preview and save; dashboard renders saved charts from definitions.
- **Public:** `/form/:slug` loads the published form by slug and renders it from metadata; client- and server-side validation; thank-you screen on success.
- **Roles:** `admin` (full access), `contributor` (view submissions and charts; cannot edit forms).

## API overview

- `POST /api/auth/register` – Register (body: `email`, `password`)
- `POST /api/auth/login` – Login (body: `email`, `password`) → `{ access_token }`
- `GET /api/forms` – List forms (auth; optional `?status=draft|published`)
- `POST /api/forms` – Create form (admin; body: `title`, `slug`)
- `GET /api/forms/:id` – Get form (auth)
- `PATCH /api/forms/:id` – Update form (admin; body: `title`, `slug`, `fields`, `rules`)
- `POST /api/forms/:id/publish` – Publish/unpublish (admin; body: `{ "publish": true|false }`)
- `DELETE /api/forms/:id` – Delete form (admin)
- `GET /api/submissions?formId=...&page=1&pageSize=20&filter=...` – List submissions (auth)
- `GET /api/submissions/export?formId=...` – CSV export (auth)
- `GET /api/charts` – List charts (auth; optional `?formId=...`)
- `POST /api/charts` – Create chart (auth)
- `GET /api/charts/:id` – Get chart (auth)
- `GET /api/charts/:id/data` – Get chart data (auth)
- `DELETE /api/charts/:id` – Delete chart (auth)
- `GET /api/public/forms/:slug` – Get published form by slug (no auth)
- `POST /api/public/forms/:slug/submit` – Submit form (no auth; body: `{ "data": { ... } }`)

All authenticated routes use `Authorization: Bearer <token>`.
