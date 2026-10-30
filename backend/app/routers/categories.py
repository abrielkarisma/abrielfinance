from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Category, User
from ..schemas import CategoryCreate, CategoryOut, CategoryUpdate
from ..security import get_current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("", response_model=list[CategoryOut])
def list_categories(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Category)
        .filter(Category.user_id == user.id)
        .order_by(Category.kind, Category.name)
        .all()
    )


@router.post("", response_model=CategoryOut, status_code=201)
def create_category(
    payload: CategoryCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    dup = (
        db.query(Category)
        .filter(
            Category.user_id == user.id,
            Category.name == payload.name,
            Category.kind == payload.kind,
        )
        .first()
    )
    if dup:
        raise HTTPException(status_code=400, detail="Kategori sudah ada")
    cat = Category(user_id=user.id, **payload.model_dump())
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cat = db.get(Category, category_id)
    if not cat or cat.user_id != user.id:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/{category_id}", status_code=204)
def delete_category(
    category_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cat = db.get(Category, category_id)
    if not cat or cat.user_id != user.id:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
    db.delete(cat)
    db.commit()
    return None
