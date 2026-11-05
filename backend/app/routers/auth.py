from fastapi import APIRouter, Depends, HTTPException
from fastapi import Request as FastAPIRequest
from fastapi.responses import RedirectResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
import urllib.parse
import urllib.request
import json
import secrets

from ..config import settings
from ..db import get_db
from ..models import Account, Category, User
from ..schemas import (
    PreferencesUpdate,
    ProfileOut,
    RefreshRequest,
    ServiceLoginRequest,
    Token,
)
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/auth", tags=["auth"])
profiles_router = APIRouter(prefix="/api", tags=["profiles"])

DEFAULT_CATEGORIES = [
    ("Makanan", "expense", "#f97316"),
    ("Transportasi", "expense", "#3b82f6"),
    ("Belanja", "expense", "#ec4899"),
    ("Hiburan", "expense", "#a855f7"),
    ("Tagihan", "expense", "#ef4444"),
    ("Kesehatan", "expense", "#14b8a6"),
    ("Lainnya", "expense", "#64748b"),
    ("Gaji", "income", "#22c55e"),
    ("Bonus", "income", "#84cc16"),
    ("Lainnya", "income", "#64748b"),
]


def _default_category_specs(db: Session) -> list[tuple]:
    demo = db.query(User).filter(User.name == "demo").first()
    if demo is not None:
        cats = (
            db.query(Category)
            .filter(Category.user_id == demo.id)
            .order_by(Category.id)
            .all()
        )
        if cats:
            return [(c.name, c.kind, c.color, c.icon) for c in cats]
    return [(name, kind, color, None) for name, kind, color in DEFAULT_CATEGORIES]


def _seed_default_categories(db: Session, user: User) -> None:
    existing = db.query(Category).filter(Category.user_id == user.id).count()
    if existing:
        return
    for name, kind, color, icon in _default_category_specs(db):
        db.add(Category(user_id=user.id, name=name, kind=kind, color=color, icon=icon))
    db.commit()


def _seed_default_account(db: Session, user: User) -> None:
    if db.query(Account).filter(Account.user_id == user.id).count():
        return
    db.add(
        Account(
            user_id=user.id,
            name="Tunai",
            type="cash",
            color="#64748b",
            opening_balance=0,
        )
    )
    db.commit()


@profiles_router.get("/profiles", response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()


@profiles_router.put("/profiles/me/preferences", response_model=ProfileOut)
def update_preferences(
    payload: PreferencesUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.salary_day = None if payload.salary_end_of_month else payload.salary_day
    user.salary_end_of_month = payload.salary_end_of_month
    db.commit()
    db.refresh(user)
    return user


@router.post("/service-login", response_model=Token)
@limiter.limit("60/minute")
def service_login(
    request: FastAPIRequest,
    payload: ServiceLoginRequest,
    db: Session = Depends(get_db),
):
    """Login khusus service internal (bot) via API key rahasia."""
    if not settings.API_SERVICE_KEY:
        raise HTTPException(status_code=503, detail="Service auth belum dikonfigurasi")
    if not secrets.compare_digest(payload.api_key, settings.API_SERVICE_KEY):
        raise HTTPException(status_code=401, detail="API key tidak valid")
    profile = db.get(User, payload.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan")
    return Token(
        access_token=create_access_token(profile.id),
        refresh_token=create_refresh_token(profile.id),
        user=ProfileOut.model_validate(profile),
    )


@router.post("/refresh", response_model=Token)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    profile_id = decode_token(payload.refresh_token, expected_type="refresh")
    profile = db.get(User, profile_id)
    if not profile:
        raise HTTPException(status_code=401, detail="Profil tidak ditemukan")
    return Token(
        access_token=create_access_token(profile.id),
        refresh_token=create_refresh_token(profile.id),
        user=ProfileOut.model_validate(profile),
    )


GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _google_exchange_code(code: str) -> dict:
    """Tukar authorization code -> token Google (access + id_token)."""
    data = urllib.parse.urlencode(
        {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
    ).encode()
    req = urllib.request.Request(GOOGLE_TOKEN_URL, data=data, method="POST")
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


def _google_userinfo(access_token: str) -> dict:
    req = urllib.request.Request(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


@router.get("/google")
def google_login():
    """Redirect ke Google consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth belum dikonfigurasi")
    params = urllib.parse.urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "prompt": "select_account",
        }
    )
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{params}")


@router.get("/google/callback")
def google_callback(code: str, request: FastAPIRequest, db: Session = Depends(get_db)):
    """Tukar code -> ambil userinfo -> cari profil by google_sub -> redirect ke FE."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Google OAuth belum dikonfigurasi")
    try:
        tokens = _google_exchange_code(code)
        info = _google_userinfo(tokens["access_token"])
    except Exception:
        raise HTTPException(status_code=401, detail="Login Google gagal, coba lagi")

    google_sub = info.get("sub")
    email = info.get("email")
    if not google_sub:
        raise HTTPException(status_code=401, detail="Akun Google tidak valid")

    profile = db.query(User).filter(User.google_sub == google_sub).first()
    if not profile and email:
        # Fallback: cari by email (untuk migrasi pas google_sub belum terikat)
        profile = db.query(User).filter(User.email == email).first()

    if not profile:
        raise HTTPException(
            status_code=403,
            detail="Akun Google belum terhubung ke profil mana pun",
        )

    if not profile.google_sub:
        profile.google_sub = google_sub
    if email:
        profile.email = email
    db.commit()
    db.refresh(profile)

    token = Token(
        access_token=create_access_token(profile.id),
        refresh_token=create_refresh_token(profile.id),
        user=ProfileOut.model_validate(profile),
    )
    params = urllib.parse.urlencode(
        {
            "access_token": token.access_token,
            "refresh_token": token.refresh_token,
            "user": token.user.model_dump_json(),
        }
    )
    return RedirectResponse(f"/auth/google-callback?{params}")
