from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Account, Category, Transaction, User
from ..schemas import TransactionCreate, TransactionOut, TransactionUpdate
from ..security import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _get_owned(db: Session, user: User, tx_id: int) -> Transaction:
    tx = db.get(Transaction, tx_id)
    if not tx or tx.user_id != user.id:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    return tx


def _check_account(db: Session, user: User, account_id: int) -> None:
    acc = db.get(Account, account_id)
    if not acc or acc.user_id != user.id:
        raise HTTPException(status_code=400, detail="Akun tidak valid")


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    start: date | None = None,
    end: date | None = None,
    category_id: int | None = None,
    account_id: int | None = None,
    kind: str | None = None,
    limit: int = 100,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Transaction).filter(Transaction.user_id == user.id)
    if start:
        q = q.filter(Transaction.date >= start)
    if end:
        q = q.filter(Transaction.date <= end)
    if category_id:
        q = q.filter(Transaction.category_id == category_id)
    if account_id:
        q = q.filter(Transaction.account_id == account_id)
    if kind:
        q = q.filter(Transaction.kind == kind)
    return q.order_by(Transaction.date.desc(), Transaction.id.desc()).limit(limit).all()


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(
    payload: TransactionCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _check_account(db, user, payload.account_id)
    if payload.kind == "transfer":
        if payload.to_account_id is None:
            raise HTTPException(status_code=400, detail="Pilih akun tujuan untuk pindah dana")
        _check_account(db, user, payload.to_account_id)
        if payload.to_account_id == payload.account_id:
            raise HTTPException(status_code=400, detail="Akun asal dan tujuan harus berbeda")
    elif payload.category_id is not None:
        cat = db.get(Category, payload.category_id)
        if not cat or cat.user_id != user.id or cat.kind != payload.kind:
            raise HTTPException(status_code=400, detail="Kategori tidak valid")
    tx = Transaction(user_id=user.id, **payload.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.patch("/{transaction_id}", response_model=TransactionOut)
def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tx = _get_owned(db, user, transaction_id)
    data = payload.model_dump(exclude_unset=True)
    kind = data.get("kind", tx.kind)
    if data.get("account_id") is not None:
        _check_account(db, user, data["account_id"])
    if kind == "transfer":
        to_acc = data.get("to_account_id", tx.to_account_id)
        if to_acc is None:
            raise HTTPException(status_code=400, detail="Pilih akun tujuan untuk pindah dana")
        _check_account(db, user, to_acc)
        src = data.get("account_id", tx.account_id)
        if to_acc == src:
            raise HTTPException(status_code=400, detail="Akun asal dan tujuan harus berbeda")
    elif data.get("category_id") is not None:
        cat = db.get(Category, data["category_id"])
        if not cat or cat.user_id != user.id or cat.kind != kind:
            raise HTTPException(status_code=400, detail="Kategori tidak valid")
    for k, v in data.items():
        setattr(tx, k, v)
    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tx = _get_owned(db, user, transaction_id)
    db.delete(tx)
    db.commit()
    return None
