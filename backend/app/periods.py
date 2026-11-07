"""
Perhitungan periode keuangan berbasis tanggal gajian.

Mode:
- Kalender (default): periode = 1 bulan kalender. Dipakai kalau user tidak
  set salary_day dan salary_end_of_month.
- Angka tetap (salary_day 1..31): periode mulai dari tanggal tsb (di-clamp ke
  akhir bulan kalau bulan pendek, mis. 30 -> Februari jadi 28/29) sampai
  tanggal yang sama bulan berikutnya.
- Akhir bulan (salary_end_of_month): periode mulai dari hari terakhir bulan ini
  sampai hari terakhir bulan berikutnya.

Gajian = AWAL periode.  Setiap periode bersifat [start, end) (end eksklusif).
"""
from datetime import date, datetime, timedelta, timezone

import calendar

MONTHS = [
    "",
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
]


def today_wib() -> date:
    """Tanggal 'hari ini' dalam zona WIB (UTC+7), apa pun TZ server."""
    return datetime.now(timezone(timedelta(hours=7))).date()


def is_calendar(salary_day: int | None, end_of_month: bool) -> bool:
    return salary_day is None and not end_of_month


def _dim(year: int, month: int) -> int:
    return calendar.monthrange(year, month)[1]


def _shift(year: int, month: int, delta: int) -> tuple[int, int]:
    total = year * 12 + (month - 1) + delta
    return total // 12, total % 12 + 1


def anchor_date(
    year: int,
    month: int,
    salary_day: int | None = None,
    end_of_month: bool = False,
) -> date:
    if end_of_month:
        return date(year, month, _dim(year, month))
    day = salary_day if salary_day else 1
    return date(year, month, min(day, _dim(year, month)))


def period_containing(
    ref: date,
    salary_day: int | None = None,
    end_of_month: bool = False,
) -> tuple[date, date]:
    """Balikin (start, end) periode yang memuat tanggal `ref`."""
    for k in range(0, -6, -1):
        y, m = _shift(ref.year, ref.month, k)
        start = anchor_date(y, m, salary_day, end_of_month)
        ny, nm = _shift(y, m, 1)
        end = anchor_date(ny, nm, salary_day, end_of_month)
        if start <= ref < end:
            return start, end
    raise ValueError("gagal menentukan periode")


def period_label(
    start: date,
    end: date,
    salary_day: int | None = None,
    end_of_month: bool = False,
) -> str:
    if is_calendar(salary_day, end_of_month):
        return f"{MONTHS[start.month]} {start.year}"
    disp = end - timedelta(days=1)
    return f"{start.day} {MONTHS[start.month]} – {disp.day} {MONTHS[disp.month]}"


def periods_list(
    as_of: date,
    count: int,
    salary_day: int | None = None,
    end_of_month: bool = False,
) -> list[tuple[date, date]]:
    """Daftar periode dari paling baru (memuat as_of) ke paling lama."""
    out: list[tuple[date, date]] = []
    start, end = period_containing(as_of, salary_day, end_of_month)
    out.append((start, end))
    for _ in range(max(0, count - 1)):
        ps, pe = period_containing(start - timedelta(days=1), salary_day, end_of_month)
        out.append((ps, pe))
        start, end = ps, pe
    return out
