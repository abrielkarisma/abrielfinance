# Fundy

Aplikasi keuangan pribadi berbasis web: kelola akun, kategori, transaksi, pengingat, dan grafik pemasukan/pengeluaran. Backend **FastAPI + SQLite**, frontend **React + Vite + Tailwind**.

## Fitur

- Multi-profil dengan PIN 4 digit (profil admin & profil personal)
- Pencatatan transaksi: pemasukan, pengeluaran, dan pindah dana antar-akun
- Akun (bank / e-wallet / tunai) dengan saldo awal dan mutasi otomatis
- Kategori yang dapat disesuaikan; grafik harian & 6 bulan dengan sumbu Y dinamis dan format jutaan
- Pengingat recurring (jadwal hari kerja, notifikasi in-app/browser)
- Mode terang/gelap dan sembunyikan/tampilkan saldo secara global
- Admin: kelola profil, reset PIN, hapus profil
- Profil baru otomatis mendapat kategori default dari profil `demo`

## Arsitektur

```
backend/     FastAPI + SQLAlchemy + SQLite
frontend/    React + Vite + Tailwind (Recharts)
```

## Menjalankan Secara Lokal

### Prasyarat

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Server berjalan di `http://localhost:8000`. Dokumentasi API otomatis di `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Buka `http://localhost:5173`.

### Database

Repo ini menyertakan **database uji** `backend/seed/fundy_demo.db` berisi data contoh (fiktif):

- Profil **demo** dengan PIN **6666**
- 10 kategori default, 3 akun, dan 12 transaksi contoh

Untuk memakai database uji:

```bash
cp backend/seed/fundy_demo.db backend/keuangan.db
```

atau arahkan `DB_PATH` di `backend/.env` ke file tersebut.

| Profil | PIN | Peran |
|--------|-----|-------|
| demo | 6666 | Personal |

> Catatan: database produksi (berisi data asli) tidak disertakan dalam repo.

## Ringkasan API

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/profiles` | Daftar profil untuk layar pemilihan |
| POST | `/api/auth/setup` | Setup awal: buat profil admin pertama |
| POST | `/api/auth/profile-login` | Login dengan profil + PIN |
| POST | `/api/auth/refresh` | Refresh JWT |
| GET/POST | `/api/categories` | List / buat kategori |
| PATCH/DELETE | `/api/categories/{id}` | Edit / hapus kategori |
| GET/POST | `/api/accounts` | List / buat akun |
| PATCH/DELETE | `/api/accounts/{id}` | Edit / hapus akun |
| GET/POST | `/api/transactions` | List / buat transaksi |
| PATCH/DELETE | `/api/transactions/{id}` | Edit / hapus transaksi |
| GET | `/api/reports/summary` | Ringkasan bulanan + breakdown per kategori |
| GET/POST | `/api/reminders` | List / buat pengingat |
| PATCH/DELETE | `/api/reminders/{id}` | Edit / hapus pengingat |
| POST | `/api/admin/profiles` | Admin: buat profil baru |

## Deployment

Aplikasi di-deploy pada VPS di belakang Cloudflare Tunnel dan diakses melalui `https://abrielfinance.my.id/`.
