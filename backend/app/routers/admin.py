import bcrypt as _bcrypt
import os as _os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Account, Category, Transaction, User
from ..schemas import (
    AdminProfileCreate,
    AdminProfileUpdate,
    AdminRoleUpdate,
    ProfileOut,
)
from ..security import get_current_admin
from .auth import _seed_default_account, _seed_default_categories
from .transactions import _account_balance

router = APIRouter(prefix="/api/admin/profiles", tags=["admin"], dependencies=[Depends(get_current_admin)])


def _random_pin_hash() -> str:
    return _bcrypt.hashpw(_os.urandom(24).hex().encode(), _bcrypt.gensalt()).decode()


def _get_profile_or_404(db: Session, profile_id: int) -> User:
    profile = db.get(User, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan")
    return profile


@router.get("", response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()


@router.get("/{profile_id}")
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(db, profile_id)
    tx_count = db.query(Transaction).filter(Transaction.user_id == profile.id).count()
    acc_count = db.query(Account).filter(Account.user_id == profile.id).count()
    cat_count = db.query(Category).filter(Category.user_id == profile.id).count()
    accounts = db.query(Account).filter(Account.user_id == profile.id).all()
    balance = sum(_account_balance(db, profile, a.id) for a in accounts)
    last_tx = (
        db.query(Transaction)
        .filter(Transaction.user_id == profile.id)
        .order_by(Transaction.date.desc(), Transaction.id.desc())
        .first()
    )
    data = ProfileOut.model_validate(profile).model_dump()
    data["stats"] = {
        "transaction_count": tx_count,
        "account_count": acc_count,
        "category_count": cat_count,
        "balance": balance,
        "last_transaction_date": str(last_tx.date) if last_tx else None,
    }
    return data


@router.post("", response_model=ProfileOut, status_code=201)
def create_profile(payload: AdminProfileCreate, db: Session = Depends(get_db)):
    if payload.email:
        existing = db.query(User).filter(User.email == str(payload.email)).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah terdaftar di profil lain")
    profile = User(
        name=payload.name,
        email=str(payload.email) if payload.email else None,
        pin_hash=_random_pin_hash(),
        avatar_color=payload.avatar_color,
        is_admin=False,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    _seed_default_categories(db, profile)
    _seed_default_account(db, profile)
    return ProfileOut.model_validate(profile)


@router.patch("/{profile_id}", response_model=ProfileOut)
def update_profile(profile_id: int, payload: AdminProfileUpdate, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(db, profile_id)
    if payload.name is not None:
        profile.name = payload.name
    if payload.email is not None:
        email = str(payload.email)
        existing = db.query(User).filter(User.email == email, User.id != profile.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah terdaftar di profil lain")
        profile.email = email
    if payload.avatar_color is not None:
        profile.avatar_color = payload.avatar_color
    db.commit()
    db.refresh(profile)
    return ProfileOut.model_validate(profile)


@router.patch("/{profile_id}/role", response_model=ProfileOut)
def set_role(
    profile_id: int,
    payload: AdminRoleUpdate,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    profile = _get_profile_or_404(db, profile_id)
    if profile.id == admin.id:
        raise HTTPException(status_code=400, detail="Tidak bisa mengubah peran profil sendiri")
    if profile.is_admin and not payload.is_admin:
        admins = db.query(User).filter(User.is_admin.is_(True)).count()
        if admins <= 1:
            raise HTTPException(status_code=400, detail="Minimal harus ada satu admin")
    profile.is_admin = payload.is_admin
    db.commit()
    db.refresh(profile)
    return ProfileOut.model_validate(profile)


@router.post("/{profile_id}/archive", response_model=ProfileOut)
def archive_profile(
    profile_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    profile = _get_profile_or_404(db, profile_id)
    if profile.id == admin.id:
        raise HTTPException(status_code=400, detail="Tidak bisa mengarsipkan profil sendiri")
    profile.archived = True
    db.commit()
    db.refresh(profile)
    return ProfileOut.model_validate(profile)


@router.post("/{profile_id}/unarchive", response_model=ProfileOut)
def unarchive_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = _get_profile_or_404(db, profile_id)
    profile.archived = False
    db.commit()
    db.refresh(profile)
    return ProfileOut.model_validate(profile)


@router.delete("/{profile_id}", status_code=204)
def delete_profile(
    profile_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    profile = _get_profile_or_404(db, profile_id)
    if profile.id == admin.id:
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus profil diri sendiri")
    if profile.is_admin:
        admins = db.query(User).filter(User.is_admin.is_(True)).count()
        if admins <= 1:
            raise HTTPException(status_code=400, detail="Minimal harus ada satu admin")
    db.delete(profile)
    db.commit()
    return None
