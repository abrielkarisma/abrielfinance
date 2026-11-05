from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Budget, Category, Transaction, User
from ..schemas import BudgetCreate, BudgetOut, BudgetProgressOut, BudgetUpdate
from ..security import get_current_user

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


def _get_owned(db: Session, user: User, budget_id: int) -> Budget:
    b = db.get(Budget, budget_id)
    if not b or b.user_id != user.id:
        raise HTTPException(status_code=404, detail="Budget tidak ditemukan")
    return b


@router.get("", response_model=list[BudgetProgressOut])
def list_budgets(
    start: date | None = None,
    end: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Daftar budget + pengeluaran aktual per kategori dalam rentang [start, end]."""
    budgets = db.query(Budget).filter(Budget.user_id == user.id).all()
    out = []
    for b in budgets:
        cat = db.get(Category, b.category_id)
        if not cat or cat.user_id != user.id:
            continue
        spent = 0.0
        if start is not None and end is not None:
            q = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
                Transaction.user_id == user.id,
                Transaction.kind == "expense",
                Transaction.category_id == b.category_id,
                Transaction.date >= start,
                Transaction.date <= end,
            )
            spent = float(q.scalar() or 0)
        out.append(
            {"id": b.id, "category": cat, "amount": float(b.amount), "spent": spent}
        )
    return out


@router.post("", response_model=BudgetOut, status_code=201)
def create_budget(
    payload: BudgetCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cat = db.get(Category, payload.category_id)
    if not cat or cat.user_id != user.id or cat.kind != "expense":
        raise HTTPException(status_code=400, detail="Kategori tidak valid")
    dup = (
        db.query(Budget)
        .filter(Budget.user_id == user.id, Budget.category_id == payload.category_id)
        .first()
    )
    if dup:
        raise HTTPException(status_code=400, detail="Budget untuk kategori ini sudah ada")
    b = Budget(user_id=user.id, **payload.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@router.patch("/{budget_id}", response_model=BudgetOut)
def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = _get_owned(db, user, budget_id)
    b.amount = payload.amount
    db.commit()
    db.refresh(b)
    return b


@router.delete("/{budget_id}", status_code=204)
def delete_budget(
    budget_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    b = _get_owned(db, user, budget_id)
    db.delete(b)
    db.commit()
    return None
