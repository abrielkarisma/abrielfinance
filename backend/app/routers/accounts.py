from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Account, Transaction, User
from ..schemas import AccountCreate, AccountOut, AccountUpdate
from ..security import get_current_user

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


def _get_owned(db: Session, user: User, acc_id: int) -> Account:
    acc = db.get(Account, acc_id)
    if not acc or acc.user_id != user.id:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan")
    return acc


@router.get("", response_model=list[AccountOut])
def list_accounts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Account)
        .filter(Account.user_id == user.id)
        .order_by(Account.created_at)
        .all()
    )


@router.post("", response_model=AccountOut, status_code=201)
def create_account(
    payload: AccountCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exists = (
        db.query(Account)
        .filter(Account.user_id == user.id, Account.name == payload.name)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Akun sudah ada")
    acc = Account(user_id=user.id, **payload.model_dump())
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.patch("/{account_id}", response_model=AccountOut)
def update_account(
    account_id: int,
    payload: AccountUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    acc = _get_owned(db, user, account_id)
    if payload.name is not None:
        exists = (
            db.query(Account)
            .filter(
                Account.user_id == user.id,
                Account.name == payload.name,
                Account.id != account_id,
            )
            .first()
        )
        if exists:
            raise HTTPException(status_code=400, detail="Akun sudah ada")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(acc, k, v)
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/{account_id}", status_code=204)
def delete_account(
    account_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    acc = _get_owned(db, user, account_id)
    if db.query(Transaction).filter(Transaction.account_id == acc.id).count() > 0:
        raise HTTPException(
            status_code=400, detail="Akun memiliki transaksi, hapus transaksinya dulu"
        )
    db.delete(acc)
    db.commit()
    return None
