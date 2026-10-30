from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Reminder, User
from ..schemas import ReminderCreate, ReminderOut, ReminderUpdate
from ..security import get_current_user

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderOut])
def list_reminders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(Reminder)
        .filter(Reminder.user_id == user.id)
        .order_by(Reminder.created_at.desc())
        .all()
    )


@router.post("", response_model=ReminderOut, status_code=201)
def create_reminder(
    payload: ReminderCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = Reminder(
        user_id=user.id,
        title=payload.title,
        note=payload.note,
        days_of_week=",".join(str(d) for d in payload.days_of_week),
        time=payload.time,
        enabled=payload.enabled,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


@router.get("/due", response_model=list[ReminderOut])
def due_reminders(
    date_str: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        d = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Tanggal tidak valid")
    wd = d.weekday()  # Senin=0 .. Minggu=6
    rows = []
    for r in db.query(Reminder).filter(
        Reminder.user_id == user.id, Reminder.enabled.is_(True)
    ):
        days = [int(x) for x in r.days_of_week.split(",") if x.strip() != ""]
        if not days or wd in days:
            rows.append(r)
    return rows


@router.patch("/{rid}", response_model=ReminderOut)
def update_reminder(
    rid: int,
    payload: ReminderUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.get(Reminder, rid)
    if not r or r.user_id != user.id:
        raise HTTPException(status_code=404, detail="Pengingat tidak ditemukan")
    data = payload.model_dump(exclude_unset=True)
    if "days_of_week" in data:
        data["days_of_week"] = ",".join(str(d) for d in data.pop("days_of_week"))
    for k, v in data.items():
        setattr(r, k, v)
    db.commit()
    db.refresh(r)
    return r


@router.delete("/{rid}", status_code=204)
def delete_reminder(
    rid: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    r = db.get(Reminder, rid)
    if not r or r.user_id != user.id:
        raise HTTPException(status_code=404, detail="Pengingat tidak ditemukan")
    db.delete(r)
    db.commit()
