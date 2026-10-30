from fastapi import APIRouter, Depends, HTTPException
from fastapi import Request as FastAPIRequest
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Account, Category, User
from ..schemas import (
    ProfileLoginRequest,
    ProfileOut,
    RefreshRequest,
    SetupRequest,
    Token,
)
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
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


@router.post("/setup", response_model=Token, status_code=201)
@limiter.limit("5/minute")
def setup(request: FastAPIRequest, payload: SetupRequest, db: Session = Depends(get_db)):
    if db.query(User).count() > 0:
        raise HTTPException(status_code=400, detail="Setup sudah dilakukan")
    admin = User(
        name=payload.name,
        pin_hash=hash_password(payload.pin),
        avatar_color="#f97316",
        is_admin=True,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    _seed_default_categories(db, admin)
    _seed_default_account(db, admin)
    return Token(
        access_token=create_access_token(admin.id),
        refresh_token=create_refresh_token(admin.id),
        user=ProfileOut.model_validate(admin),
    )


@router.post("/profile-login", response_model=Token)
@limiter.limit("10/minute")
def profile_login(
    request: FastAPIRequest,
    payload: ProfileLoginRequest,
    db: Session = Depends(get_db),
):
    profile = db.get(User, payload.profile_id)
    if not profile or not verify_password(payload.pin, profile.pin_hash):
        raise HTTPException(status_code=401, detail="Profil atau PIN salah")
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
