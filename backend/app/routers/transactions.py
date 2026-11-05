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


def _account_balance(
    db: Session, user: User, account_id: int, exclude_tx_id: int | None = None
) -> float:
    """Saldo akun (sepanjang waktu), kecuali satu transaksi tertentu."""
    acc = db.get(Account, account_id)
    if not acc or acc.user_id != user.id:
        return 0.0
    base = float(acc.opening_balance)

    # keluar: expense + transfer asal
    q = db.query(Transaction).filter(
        Transaction.user_id == user.id, Transaction.account_id == account_id
    )
    if exclude_tx_id is not None:
        q = q.filter(Transaction.id != exclude_tx_id)
    for t in q.all():
        if t.kind == "income":
            base += float(t.amount)
        else:  # expense / transfer (keluar dari akun ini)
            base -= float(t.amount)

    # masuk: transfer tujuan
    q2 = db.query(Transaction).filter(
        Transaction.user_id == user.id,
        Transaction.to_account_id == account_id,
        Transaction.kind == "transfer",
    )
    if exclude_tx_id is not None:
        q2 = q2.filter(Transaction.id != exclude_tx_id)
    for t in q2.all():
        base += float(t.amount)

    return base


def _fmt_rupiah(n: float) -> str:
    return "Rp " + f"{int(n):,}".replace(",", ".")


def _ensure_balance(
    db: Session, user: User, account_id: int, amount: float, exclude_tx_id: int | None = None
) -> None:
    bal = _account_balance(db, user, account_id, exclude_tx_id)
    if bal < amount:
        acc = db.get(Account, account_id)
        name = acc.name if acc else "Akun"
        raise HTTPException(
            status_code=400,
            detail=f"{name}: saldo tidak cukup (sisa {_fmt_rupiah(max(bal, 0))})",
        )


@router.get("")
def list_transactions(
    start: date | None = None,
    end: date | None = None,
    category_id: int | None = None,
    account_id: int | None = None,
    kind: str | None = None,
    limit: int = 10,
    offset: int = 0,
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
    total = q.count()
    items = q.order_by(Transaction.date.desc(), Transaction.id.desc()).offset(offset).limit(limit).all()
    return {"items": [TransactionOut.model_validate(i) for i in items], "total": total}


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

    fee = payload.admin_fee or 0.0
    needed = payload.amount + (fee if payload.kind == "transfer" else 0.0)
    if payload.kind in ("expense", "transfer"):
        _ensure_balance(db, user, payload.account_id, needed)

    tx = Transaction(user_id=user.id, **payload.model_dump(exclude={"admin_fee"}))
    db.add(tx)
    if payload.kind == "transfer" and fee > 0:
        cat_lain = db.query(Category).filter(
            Category.user_id == user.id,
            Category.kind == "expense",
            Category.name == "Lainnya",
        ).first()
        fee_tx = Transaction(
            user_id=user.id,
            kind="expense",
            amount=fee,
            date=payload.date,
            time=payload.time,
            account_id=payload.account_id,
            category_id=(cat_lain.id if cat_lain else None),
            note="biaya admin transfer",
        )
        db.add(fee_tx)
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

    if kind in ("expense", "transfer"):
        src = data.get("account_id", tx.account_id)
        amt = data.get("amount", tx.amount)
        _ensure_balance(db, user, src, amt, exclude_tx_id=tx.id)

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
