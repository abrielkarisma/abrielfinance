from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..schemas import (
    AdminProfileCreate,
    AdminProfileUpdate,
    ProfileOut,
    ResetPinRequest,
)
from ..security import get_current_admin, hash_password
from .auth import _seed_default_account, _seed_default_categories

router = APIRouter(prefix="/api/admin/profiles", tags=["admin"], dependencies=[Depends(get_current_admin)])


@router.get("", response_model=list[ProfileOut])
def list_profiles(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.id).all()


@router.post("", response_model=ProfileOut, status_code=201)
def create_profile(payload: AdminProfileCreate, db: Session = Depends(get_db)):
    profile = User(
        name=payload.name,
        pin_hash=hash_password(payload.pin),
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
    profile = db.get(User, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan")
    if payload.name is not None:
        profile.name = payload.name
    if payload.avatar_color is not None:
        profile.avatar_color = payload.avatar_color
    db.commit()
    db.refresh(profile)
    return ProfileOut.model_validate(profile)


@router.post("/{profile_id}/reset-pin", status_code=204)
def reset_pin(profile_id: int, payload: ResetPinRequest, db: Session = Depends(get_db)):
    profile = db.get(User, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan")
    profile.pin_hash = hash_password(payload.new_pin)
    db.commit()
    return None


@router.delete("/{profile_id}", status_code=204)
def delete_profile(
    profile_id: int,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    profile = db.get(User, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profil tidak ditemukan")
    if profile.id == admin.id:
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus profil diri sendiri")
    if profile.is_admin:
        admins = db.query(User).filter(User.is_admin.is_(True)).count()
        if admins <= 1:
            raise HTTPException(status_code=400, detail="Minimal harus ada satu admin")
    db.delete(profile)
    db.commit()
    return None
