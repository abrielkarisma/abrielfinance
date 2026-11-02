from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from slowapi.errors import RateLimitExceeded
from sqlalchemy import inspect, text

from . import models
from .db import Base, engine
from .routers import accounts, admin, auth, categories, reminders, reports, transactions

DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


def _ensure_schema():
    """Migrasi ringan: tambah kolom baru kalau belum ada (SQLite)."""
    cols = {c["name"] for c in inspect(engine).get_columns("profiles")}
    with engine.begin() as conn:
        if "salary_day" not in cols:
            conn.execute(text("ALTER TABLE profiles ADD COLUMN salary_day INTEGER"))
        if "salary_end_of_month" not in cols:
            conn.execute(
                text(
                    "ALTER TABLE profiles ADD COLUMN salary_end_of_month "
                    "BOOLEAN NOT NULL DEFAULT 0"
                )
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _ensure_schema()
    yield


app = FastAPI(title="Keuangan Pribadi API", lifespan=lifespan)
app.state.limiter = auth.limiter


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.exception_handler(RateLimitExceeded)
async def _rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"detail": "Terlalu banyak percobaan, coba lagi nanti"})


app.include_router(auth.router)
app.include_router(auth.profiles_router)
app.include_router(admin.router)
app.include_router(accounts.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(reports.router)
app.include_router(reminders.router)


if DIST.is_dir():
    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):
        target = DIST / full_path
        if target.is_file() and target.suffix:
            return FileResponse(target)
        return FileResponse(DIST / "index.html")
