# Keuangan Pribadi

Aplikasi web pencatat keuangan pribadi (pengeluaran/pemasukan) — multi-user, dengan UI Bahasa Indonesia.

- **Backend:** Python FastAPI + SQLite (SQLAlchemy) + JWT (access/refresh) + bcrypt + rate-limit
- **Frontend:** Vite + React + Tailwind CSS + Recharts
- **Produksi:** FastAPI melayani `/api/*` sekaligus static `frontend/dist/` (1 service aja)

## Struktur

```
keuangan-app/
├── backend/          # FastAPI app
│   ├── app/
│   │   ├── main.py       # entry + serve SPA
│   │   ├── config.py      # env (pydantic-settings)
│   │   ├── db.py          # SQLAlchemy engine/session
│   │   ├── models.py       # ORM
│   │   ├── schemas.py      # Pydantic
│   │   ├── security.py     # bcrypt + JWT
│   │   └── routers/        # auth, categories, transactions, reports
│   ├── requirements.txt
│   └── .env.example
└── frontend/         # Vite + React
    └── src/
        ├── pages/         # Login, Register, Dashboard, Transaksi, Kategori
        ├── components/    # Layout, UI kit
        └── lib/api.js      # axios wrapper + auto-refresh token
```

## API (ringkas)

| Method | Endpoint | Deskripsi |
|---|---|---|
| POST | `/api/auth/register` | Daftar (auto-login) |
| POST | `/api/auth/login` | Login (rate-limit) |
| POST | `/api/auth/refresh` | Refresh JWT |
| POST | `/api/auth/change-password` | Ganti password |
| GET/POST | `/api/categories` | List / buat kategori |
| PATCH/DELETE | `/api/categories/{id}` | Edit / hapus kategori |
| GET/POST | `/api/transactions` | List / buat transaksi |
| PATCH/DELETE | `/api/transactions/{id}` | Edit / hapus transaksi |
| GET | `/api/reports/summary` | Ringkasan bulanan + breakdown per kategori |

Semua `/api/*` (kecuali login/register) wajib `Authorization: Bearer <token>`.

## Jalanin Lokal

**Backend:**
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # isi SECRET_KEY
uvicorn app.main:app --reload    # http://127.0.0.1:8000
```

**Frontend (dev, hot-reload):**
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173 (proxy /api → :8000)
```

**Produksi (1 service):** build frontend, backend langsung serve staticnya.
```bash
cd frontend && npm run build
cd ../backend && uvicorn app.main:app --host 127.0.0.1 --port 8000
# buka http://127.0.0.1:8000
```

### Env (`.env`)
```
SECRET_KEY=<random-64-hex>        # buat: python -c "import secrets;print(secrets.token_hex(32))"
DB_PATH=keuangan.db
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
```
