from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import AccountNumber, User
from ..schemas import AccountNumberCreate, AccountNumberOut, AccountNumberUpdate
from ..security import get_current_user

router = APIRouter(prefix="/api/account-numbers", tags=["account-numbers"])


def _get_owned(db: Session, user: User, number_id: int) -> AccountNumber:
    n = db.get(AccountNumber, number_id)
    if not n or n.user_id != user.id:
        raise HTTPException(status_code=404, detail="Nomor rekening tidak ditemukan")
    return n


@router.get("", response_model=list[AccountNumberOut])
def list_numbers(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(AccountNumber)
        .filter(AccountNumber.user_id == user.id)
        .order_by(AccountNumber.created_at)
        .all()
    )


@router.post("", response_model=AccountNumberOut, status_code=201)
def create_number(
    payload: AccountNumberCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    exists = (
        db.query(AccountNumber)
        .filter(AccountNumber.user_id == user.id, AccountNumber.number == payload.number)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Nomor rekening sudah ada")
    n = AccountNumber(user_id=user.id, **payload.model_dump())
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


@router.patch("/{number_id}", response_model=AccountNumberOut)
def update_number(
    number_id: int,
    payload: AccountNumberUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = _get_owned(db, user, number_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(n, k, v)
    db.commit()
    db.refresh(n)
    return n


@router.delete("/{number_id}", status_code=204)
def delete_number(
    number_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_owned(db, user, number_id)
    db.query(AccountNumber).filter(
        AccountNumber.id == number_id, AccountNumber.user_id == user.id
    ).delete()
    db.commit()
