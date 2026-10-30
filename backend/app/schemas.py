from datetime import date, datetime
from datetime import date as _Date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


def _check_pin(v: str) -> str:
    if not isinstance(v, str) or len(v) != 4 or not v.isdigit():
        raise ValueError("PIN harus 4 angka")
    return v


class ProfileOut(BaseModel):
    id: int
    name: str
    avatar_color: str = "#64748b"
    is_admin: bool = False

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: ProfileOut


class ProfileLoginRequest(BaseModel):
    profile_id: int
    pin: str

    _pin = field_validator("pin")(_check_pin)


class SetupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    pin: str

    _pin = field_validator("pin")(_check_pin)


class AdminProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    pin: str
    avatar_color: str = "#64748b"

    _pin = field_validator("pin")(_check_pin)


class AdminProfileUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    avatar_color: Optional[str] = None


class ResetPinRequest(BaseModel):
    new_pin: str

    _pin = field_validator("new_pin")(_check_pin)


class RefreshRequest(BaseModel):
    refresh_token: str


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    type: str = Field(default="bank", pattern="^(bank|ewallet|cash)$")
    color: str = "#64748b"
    opening_balance: float = Field(default=0, ge=0)


class AccountUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    type: Optional[str] = Field(default=None, pattern="^(bank|ewallet|cash)$")
    color: Optional[str] = None
    opening_balance: Optional[float] = Field(default=None, ge=0)


class AccountOut(BaseModel):
    id: int
    name: str
    type: str
    color: str
    opening_balance: float

    class Config:
        from_attributes = True


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    kind: str = Field(pattern="^(expense|income)$")
    color: str = "#64748b"
    icon: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    kind: Optional[str] = Field(default=None, pattern="^(expense|income)$")
    color: Optional[str] = None
    icon: Optional[str] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    kind: str
    color: str
    icon: Optional[str] = None

    class Config:
        from_attributes = True


class TransactionCreate(BaseModel):
    kind: str = Field(pattern="^(expense|income|transfer)$")
    amount: float = Field(gt=0)
    date: date
    time: Optional[str] = Field(default=None, pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$")
    account_id: int
    to_account_id: Optional[int] = None
    category_id: Optional[int] = None
    note: Optional[str] = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _validate_transfer(self):
        if self.kind == "transfer":
            if self.to_account_id is None:
                raise ValueError("Pilih akun tujuan untuk pindah dana")
            if self.to_account_id == self.account_id:
                raise ValueError("Akun asal dan tujuan harus berbeda")
        return self


class TransactionUpdate(BaseModel):
    kind: Optional[str] = Field(default=None, pattern="^(expense|income|transfer)$")
    amount: Optional[float] = Field(default=None, gt=0)
    date: Optional[_Date] = None
    time: Optional[str] = Field(default=None, pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$")
    account_id: Optional[int] = None
    to_account_id: Optional[int] = None
    category_id: Optional[int] = None
    note: Optional[str] = Field(default=None, max_length=500)


class TransactionOut(BaseModel):
    id: int
    kind: str
    amount: float
    date: date
    time: Optional[str] = None
    account_id: int
    to_account_id: Optional[int] = None
    category_id: Optional[int] = None
    note: Optional[str] = None
    account: Optional[AccountOut] = None
    to_account: Optional[AccountOut] = None
    category: Optional[CategoryOut] = None

    class Config:
        from_attributes = True


class CategoryTotal(BaseModel):
    category: Optional[CategoryOut] = None
    total: float


class MonthlySummary(BaseModel):
    total_income: float
    total_expense: float
    balance: float
    by_category: list[CategoryTotal]


class AccountBalance(BaseModel):
    account: AccountOut
    opening_balance: float
    total_income: float
    total_expense: float
    total_transfer_out: float = 0
    total_transfer_in: float = 0
    balance: float


class AccountsSummary(BaseModel):
    accounts: list[AccountBalance]
    total_balance: float


class ReminderCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    note: Optional[str] = Field(default=None, max_length=500)
    days_of_week: list[int] = Field(default_factory=list)  # Mon=0..Sun=6; kosong = setiap hari
    time: Optional[str] = Field(default=None, pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$")
    enabled: bool = True


class ReminderUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=150)
    note: Optional[str] = Field(default=None, max_length=500)
    days_of_week: Optional[list[int]] = None
    time: Optional[str] = Field(default=None, pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$")
    enabled: Optional[bool] = None


class ReminderOut(BaseModel):
    id: int
    title: str
    note: Optional[str] = None
    days_of_week: list[int]
    time: Optional[str] = None
    enabled: bool
    created_at: datetime

    @field_validator("days_of_week", mode="before")
    @classmethod
    def _parse_days(cls, v):
        if isinstance(v, str):
            return [int(x) for x in v.split(",") if x.strip() != ""]
        return v

    class Config:
        from_attributes = True
