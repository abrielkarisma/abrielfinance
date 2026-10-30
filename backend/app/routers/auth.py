from fastapi import APIRouter, Depends, HTTPException
from fastapi import Request as FastAPIRequest
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Category, User
from ..schemas import (
    ChangePassword,
    LoginRequest,
    RefreshRequest,
    Token,
    UserCreate,
    UserOut,
)
from ..security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_password,
    verify_password,
)

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/auth", tags=["auth"])

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


def _seed_default_categories(db: Session, user: User) -> None:
    existing = db.query(Category).filter(Category.user_id == user.id).count()
    if existing:
        return
    for name, kind, color in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user.id, name=name, kind=kind, color=color))
    db.commit()


@router.post("/register", response_model=Token, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    exists = db.query(User).filter(User.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    user = User(
        email=payload.email,
        name=payload.name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _seed_default_categories(db, user)
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: FastAPIRequest, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/refresh", response_model=Token)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    user_id = decode_token(payload.refresh_token, expected_type="refresh")
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User tidak ditemukan")
    return Token(
        access_token=create_access_token(user.id),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
    )


@router.post("/change-password", status_code=204)
def change_password(
    payload: ChangePassword,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Password lama salah")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return None
