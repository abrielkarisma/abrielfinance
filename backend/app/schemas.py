from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePassword(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128)


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
    kind: str = Field(pattern="^(expense|income)$")
    amount: float = Field(gt=0)
    date: date
    account_id: int
    category_id: Optional[int] = None
    note: Optional[str] = Field(default=None, max_length=500)


class TransactionUpdate(BaseModel):
    kind: Optional[str] = Field(default=None, pattern="^(expense|income)$")
    amount: Optional[float] = Field(default=None, gt=0)
    date: Optional[date] = None
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    note: Optional[str] = Field(default=None, max_length=500)


class TransactionOut(BaseModel):
    id: int
    kind: str
    amount: float
    date: date
    account_id: int
    category_id: Optional[int] = None
    note: Optional[str] = None
    account: Optional[AccountOut] = None
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
    balance: float


class AccountsSummary(BaseModel):
    accounts: list[AccountBalance]
    total_balance: float
