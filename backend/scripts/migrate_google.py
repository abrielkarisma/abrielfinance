#!/usr/bin/env python3
"""Migrasi data profil -> profil baru yang terikat Google.

Cara B: buat 2 profil baru (terikat email Google), copy SEMUA data dari
profil sumber, dengan remap FK (accounts/categories/transactions/budgets).
Profil sumber dibiarkan (diarsipkan), tidak dihapus.

Penggunaan:
    .venv/bin/python scripts/migrate_google.py
"""
import os
import random
import string
import sys

from sqlalchemy import create_engine, text

DB_PATH = os.environ.get("DB_PATH", "/var/lib/keuangan/app.db")

MIGRATIONS = [
    {"src_id": 1, "name": "Abriel", "email": "abrielcha.ac@gmail.com", "is_admin": True},
    {"src_id": 2, "name": "demo", "email": "abrielkarisma1@gmail.com", "is_admin": False},
]


def random_pin_hash() -> str:
    """pin_hash random -> login PIN tak mungkin untuk profil baru."""
    import bcrypt as _bcrypt
    return _bcrypt.hashpw(os.urandom(24).hex().encode(), _bcrypt.gensalt()).decode()


def main() -> None:
    if not os.path.exists(DB_PATH):
        print(f"DB tidak ditemukan: {DB_PATH}")
        sys.exit(1)

    engine = create_engine(f"sqlite:///{DB_PATH}")
    with engine.begin() as conn:
        for m in MIGRATIONS:
            src = m["src_id"]

            # Cek apakah profil dgn email ini sudah ada (idempotent)
            existing = conn.execute(
                text("SELECT id FROM profiles WHERE email = :email"),
                {"email": m["email"]},
            ).first()
            if existing:
                print(f"[skip] email {m['email']} sudah terikat ke profil {existing[0]}")
                continue

            # 1. Buat profil baru
            res = conn.execute(
                text(
                    "INSERT INTO profiles (name, pin_hash, google_sub, email, avatar_color, is_admin, salary_day, salary_end_of_month, created_at) "
                    "VALUES (:name, :pin, NULL, :email, :color, :admin, NULL, 0, datetime('now'))"
                ),
                {
                    "name": m["name"],
                    "pin": random_pin_hash(),
                    "email": m["email"],
                    "color": "#64748b",
                    "admin": 1 if m["is_admin"] else 0,
                },
            )
            new_id = res.lastrowid
            print(f"[+] profil baru id={new_id} name={m['name']} email={m['email']}")

            # 2. Copy ACCOUNTS + map old->new
            acc_map = {}
            rows = conn.execute(
                text("SELECT id, name, type, color, opening_balance, created_at FROM accounts WHERE user_id = :uid"),
                {"uid": src},
            ).fetchall()
            for r in rows:
                r2 = conn.execute(
                    text(
                        "INSERT INTO accounts (user_id, name, type, color, opening_balance, created_at) "
                        "VALUES (:uid, :name, :type, :color, :bal, :created)"
                    ),
                    {
                        "uid": new_id,
                        "name": r[1],
                        "type": r[2],
                        "color": r[3],
                        "bal": r[4],
                        "created": r[5],
                    },
                )
                acc_map[r[0]] = r2.lastrowid
            print(f"    accounts: {len(rows)} -> {len(acc_map)}")

            # 3. Copy CATEGORIES + map old->new
            cat_map = {}
            rows = conn.execute(
                text("SELECT id, name, kind, color, icon, created_at FROM categories WHERE user_id = :uid"),
                {"uid": src},
            ).fetchall()
            for r in rows:
                r2 = conn.execute(
                    text(
                        "INSERT INTO categories (user_id, name, kind, color, icon, created_at) "
                        "VALUES (:uid, :name, :kind, :color, :icon, :created)"
                    ),
                    {
                        "uid": new_id,
                        "name": r[1],
                        "kind": r[2],
                        "color": r[3],
                        "icon": r[4],
                        "created": r[5],
                    },
                )
                cat_map[r[0]] = r2.lastrowid
            print(f"    categories: {len(rows)} -> {len(cat_map)}")

            # 4. Copy TRANSACTIONS (remap account_id / to_account_id / category_id)
            rows = conn.execute(
                text(
                    "SELECT account_id, to_account_id, category_id, kind, amount, date, time, note, created_at "
                    "FROM transactions WHERE user_id = :uid"
                ),
                {"uid": src},
            ).fetchall()
            for r in rows:
                acc_id = acc_map.get(r[0])
                to_acc = acc_map.get(r[1]) if r[1] else None
                cat_id = cat_map.get(r[2]) if r[2] else None
                conn.execute(
                    text(
                        "INSERT INTO transactions (user_id, account_id, to_account_id, category_id, kind, amount, date, time, note, created_at) "
                        "VALUES (:uid, :acc, :toacc, :cat, :kind, :amount, :date, :time, :note, :created)"
                    ),
                    {
                        "uid": new_id,
                        "acc": acc_id,
                        "toacc": to_acc,
                        "cat": cat_id,
                        "kind": r[3],
                        "amount": r[4],
                        "date": r[5],
                        "time": r[6],
                        "note": r[7],
                        "created": r[8],
                    },
                )
            print(f"    transactions: {len(rows)}")

            # 5. Copy REMINDERS
            rows = conn.execute(
                text(
                    "SELECT title, note, days_of_week, time, kind, target_date, enabled, created_at "
                    "FROM reminders WHERE user_id = :uid"
                ),
                {"uid": src},
            ).fetchall()
            for r in rows:
                conn.execute(
                    text(
                        "INSERT INTO reminders (user_id, title, note, days_of_week, time, kind, target_date, enabled, created_at) "
                        "VALUES (:uid, :title, :note, :days, :time, :kind, :date, :enabled, :created)"
                    ),
                    {
                        "uid": new_id,
                        "title": r[0],
                        "note": r[1],
                        "days": r[2],
                        "time": r[3],
                        "kind": r[4],
                        "date": r[5],
                        "enabled": 1 if r[6] else 0,
                        "created": r[7],
                    },
                )
            print(f"    reminders: {len(rows)}")

            # 6. Copy ACCOUNT_NUMBERS
            rows = conn.execute(
                text("SELECT name, holder, number, created_at FROM account_numbers WHERE user_id = :uid"),
                {"uid": src},
            ).fetchall()
            for r in rows:
                conn.execute(
                    text(
                        "INSERT INTO account_numbers (user_id, name, holder, number, created_at) "
                        "VALUES (:uid, :name, :holder, :number, :created)"
                    ),
                    {
                        "uid": new_id,
                        "name": r[0],
                        "holder": r[1],
                        "number": r[2],
                        "created": r[3],
                    },
                )
            print(f"    account_numbers: {len(rows)}")

            # 7. Copy BUDGETS (remap category_id)
            rows = conn.execute(
                text("SELECT category_id, amount, created_at FROM budgets WHERE user_id = :uid"),
                {"uid": src},
            ).fetchall()
            for r in rows:
                cat_id = cat_map.get(r[0])
                conn.execute(
                    text(
                        "INSERT INTO budgets (user_id, category_id, amount, created_at) "
                        "VALUES (:uid, :cat, :amount, :created)"
                    ),
                    {
                        "uid": new_id,
                        "cat": cat_id,
                        "amount": r[1],
                        "created": r[2],
                    },
                )
            print(f"    budgets: {len(rows)}")

    print("\nSELESAI. Verifikasi dengan query skema.")


if __name__ == "__main__":
    main()
