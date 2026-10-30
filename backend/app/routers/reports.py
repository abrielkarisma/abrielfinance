from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..models import Account, Transaction, User
from ..schemas import (
    AccountBalance,
    AccountOut,
    AccountsSummary,
    CategoryOut,
    CategoryTotal,
    MonthlySummary,
)
from ..security import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _month_range(year: int, month: int) -> tuple[date, date]:
    start = date(year, month, 1)
    if month == 12:
        end = date(year + 1, 1, 1)
    else:
        end = date(year, month + 1, 1)
    return start, end


@router.get("/summary", response_model=MonthlySummary)
def summary(
    year: int | None = None,
    month: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    year = year or today.year
    month = month or today.month
    if not (1 <= month <= 12):
        month = today.month
    start, end = _month_range(year, month)

    txns = (
        db.query(Transaction)
        .options(joinedload(Transaction.category))
        .filter(
            Transaction.user_id == user.id,
            Transaction.date >= start,
            Transaction.date < end,
        )
        .all()
    )

    income = sum(t.amount for t in txns if t.kind == "income")
    expense = sum(t.amount for t in txns if t.kind == "expense")

    grouped: dict[str, CategoryTotal] = {}
    for t in txns:
        key = f"{t.kind}:{t.category_id or 0}"
        if key not in grouped:
            grouped[key] = CategoryTotal(
                category=CategoryOut.model_validate(t.category) if t.category else None,
                total=0.0,
            )
        grouped[key].total += float(t.amount)

    by_category = sorted(grouped.values(), key=lambda c: -c.total)
    return MonthlySummary(
        total_income=float(income),
        total_expense=float(expense),
        balance=float(income - expense),
        by_category=by_category,
    )


@router.get("/accounts", response_model=AccountsSummary)
def accounts_summary(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    accounts = (
        db.query(Account)
        .filter(Account.user_id == user.id)
        .order_by(Account.created_at)
        .all()
    )
    txns = db.query(Transaction).filter(Transaction.user_id == user.id).all()

    by_acc: dict[int, dict[str, float]] = {}
    for t in txns:
        d = by_acc.setdefault(t.account_id, {"income": 0.0, "expense": 0.0})
        d[t.kind] += float(t.amount)

    rows = []
    for a in accounts:
        d = by_acc.get(a.id, {"income": 0.0, "expense": 0.0})
        balance = float(a.opening_balance) + d["income"] - d["expense"]
        rows.append(
            AccountBalance(
                account=AccountOut.model_validate(a),
                opening_balance=float(a.opening_balance),
                total_income=d["income"],
                total_expense=d["expense"],
                balance=balance,
            )
        )

    return AccountsSummary(
        accounts=rows,
        total_balance=sum(r.balance for r in rows),
    )
