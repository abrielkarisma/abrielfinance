from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload

from ..db import get_db
from ..models import Account, Transaction, User
from ..periods import period_containing, periods_list
from ..schemas import (
    AccountBalance,
    AccountOut,
    AccountsSummary,
    CategoryOut,
    CategoryTotal,
    MonthlySummary,
    PeriodListOut,
    PeriodOut,
)
from ..security import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _period_range(
    user: User, start: date | None = None, end: date | None = None
) -> tuple[date, date]:
    if start is not None and end is not None:
        return start, end
    s, e = period_containing(date.today(), user.salary_day, user.salary_end_of_month)
    return start or s, end or e


@router.get("/periods", response_model=PeriodListOut)
def periods(
    as_of: date | None = None,
    count: int = Query(6, ge=1, le=120),
    user: User = Depends(get_current_user),
):
    as_of = as_of or date.today()
    rows = periods_list(as_of, count, user.salary_day, user.salary_end_of_month)
    return PeriodListOut(
        periods=[
            PeriodOut(start=s, end=e, label=_period_label(user, s, e)) for s, e in rows
        ]
    )


def _period_label(user: User, start: date, end: date) -> str:
    from ..periods import period_label

    return period_label(start, end, user.salary_day, user.salary_end_of_month)


@router.get("/summary", response_model=MonthlySummary)
def summary(
    start: date | None = None,
    end: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    start, end = _period_range(user, start, end)

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
        if t.kind not in ("income", "expense"):
            continue
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
    end: date | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _, period_end = _period_range(user, end=end)
    accounts = (
        db.query(Account)
        .filter(Account.user_id == user.id)
        .order_by(Account.created_at)
        .all()
    )
    txq = db.query(Transaction).filter(
        Transaction.user_id == user.id, Transaction.date < period_end
    )
    txns = txq.all()

    by_acc: dict[int, dict[str, float]] = {}
    for t in txns:
        if t.kind == "transfer":
            d = by_acc.setdefault(t.account_id, {"income": 0.0, "expense": 0.0, "out": 0.0, "in": 0.0})
            d["out"] += float(t.amount)
            if t.to_account_id is not None:
                e = by_acc.setdefault(t.to_account_id, {"income": 0.0, "expense": 0.0, "out": 0.0, "in": 0.0})
                e["in"] += float(t.amount)
        else:
            d = by_acc.setdefault(t.account_id, {"income": 0.0, "expense": 0.0, "out": 0.0, "in": 0.0})
            d[t.kind] += float(t.amount)

    rows = []
    for a in accounts:
        d = by_acc.get(a.id, {"income": 0.0, "expense": 0.0, "out": 0.0, "in": 0.0})
        balance = float(a.opening_balance) + d["income"] - d["expense"] - d["out"] + d["in"]
        rows.append(
            AccountBalance(
                account=AccountOut.model_validate(a),
                opening_balance=float(a.opening_balance),
                total_income=d["income"],
                total_expense=d["expense"],
                total_transfer_out=d["out"],
                total_transfer_in=d["in"],
                balance=balance,
            )
        )

    return AccountsSummary(
        accounts=rows,
        total_balance=sum(r.balance for r in rows),
    )
