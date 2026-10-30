from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    pin_hash: Mapped[str] = mapped_column(String(255))
    avatar_color: Mapped[str] = mapped_column(String(20), default="#64748b")
    is_admin: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    transactions = relationship(
        "Transaction", back_populates="user", cascade="all, delete-orphan"
    )
    categories = relationship(
        "Category", back_populates="user", cascade="all, delete-orphan"
    )
    accounts = relationship(
        "Account", back_populates="user", cascade="all, delete-orphan"
    )
    reminders = relationship(
        "Reminder", back_populates="user", cascade="all, delete-orphan"
    )


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    type: Mapped[str] = mapped_column(String(20), default="bank")  # bank | ewallet | cash
    color: Mapped[str] = mapped_column(String(20), default="#64748b")
    opening_balance: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="accounts")
    transactions = relationship(
        "Transaction",
        back_populates="account",
        foreign_keys="Transaction.account_id",
    )


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    kind: Mapped[str] = mapped_column(String(10))  # expense | income
    color: Mapped[str] = mapped_column(String(20), default="#64748b")
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    to_account_id: Mapped[int | None] = mapped_column(
        ForeignKey("accounts.id"), nullable=True
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id"), nullable=True
    )
    kind: Mapped[str] = mapped_column(String(10))  # expense | income
    amount: Mapped[float] = mapped_column(Numeric(14, 2))
    date: Mapped[date] = mapped_column(Date, index=True)
    time: Mapped[str | None] = mapped_column(String(5), nullable=True)  # HH:MM
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="transactions")
    account = relationship("Account", foreign_keys=[account_id], back_populates="transactions")
    to_account = relationship("Account", foreign_keys=[to_account_id])
    category = relationship("Category", back_populates="transactions")


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("profiles.id"), index=True)
    title: Mapped[str] = mapped_column(String(150))
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    days_of_week: Mapped[str] = mapped_column(String(30), default="")  # "0,1,2" Mon=0..Sun=6; kosong = setiap hari
    time: Mapped[str | None] = mapped_column(String(5), nullable=True)  # HH:mm
    enabled: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reminders")
