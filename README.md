# Dashboard Tracking KKP — dengan login & akses per-bank

## Isi folder

```
project/
├── netlify.toml
├── public/
│   └── index.html                          <- dashboard + form login
└── netlify/
    └── functions/
        ├── get-bank-data.mts                <- verifikasi role sebelum kirim data
        └── identity-signup.mts.example      <- opsional, auto-assign role saat signup
```

## Langkah deploy

### 1. Push ke GitHub

```bash
cd project
git init
git add .
git commit -m "Dashboard KKP dengan Netlify Identity"
```

Buat repo baru di GitHub (bisa **private**), lalu:

```bash
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git branch -M main
git push -u origin main
```

### 2. Hubungkan ke Netlify

Di dashboard Netlify: **Add new site → Import an existing project → GitHub** →
pilih repo tadi. Netlify otomatis mendeteksi `netlify.toml` (publish
directory `public`, functions di `netlify/functions`) — biarkan default,
klik **Deploy**.

> Alternatif tanpa GitHub: install Netlify CLI (`npm i -g netlify-cli`),
> lalu dari folder `project/` jalankan `netlify deploy --prod`.

### 3. Aktifkan Identity

Di site yang baru dideploy: **Project configuration → Identity → Enable
Identity**. Lalu di **Identity → Settings → Registration**, pilih
**Invite only**.

### 4. Undang 8 user

**Identity → Users → Invite users**, undang satu email per bank.

### 5. Assign role

Setelah tiap user meng-klik link undangan dan set password (status jadi
"Confirmed"), klik nama usernya, edit **app_metadata**, isi persis:

| User untuk | app_metadata yang diisi |
|---|---|
| BTN | `{"roles": ["btn"]}` |
| BRI RO Surabaya | `{"roles": ["bri_surabaya"]}` |
| BRI RO Malang | `{"roles": ["bri_malang"]}` |
| BNI RO Surabaya | `{"roles": ["bni_surabaya"]}` |
| BNI RO Malang | `{"roles": ["bni_malang"]}` |
| Bank Mandiri | `{"roles": ["mandiri"]}` |
| Bank Jatim | `{"roles": ["jatim"]}` |
| BSI | `{"roles": ["bsi"]}` |

(Opsional) buat satu user tambahan dengan `{"roles": ["admin"]}` kalau Anda
sendiri ingin bisa melihat semua bank sekaligus.

Kalau tidak mau assign manual satu-satu, rename
`netlify/functions/identity-signup.mts.example` menjadi
`identity-signup.mts`, isi peta email di dalamnya, lalu deploy ulang — role
akan terisi otomatis saat user confirm undangan.

### 6. Selesai — coba login

Buka URL site Anda, login pakai salah satu akun yang sudah di-set password.
Filter Bank di dashboard akan otomatis terkunci ke bank milik akun
tersebut, dan Netlify Function akan menolak (403) kalau ada percobaan
mengambil data bank lain.

## Kenapa harus lewat GitHub/CLI, bukan drag-and-drop?

Netlify Drop (drag-and-drop file HTML) hanya men-deploy file statis, tidak
menjalankan folder `netlify/functions/`. Karena verifikasi role di project
ini terjadi di Netlify Function (`get-bank-data.mts`), deploy harus lewat
Git atau Netlify CLI supaya function-nya ikut ter-build dan aktif.

## Catatan keamanan

- Spreadsheet sumber tetap perlu di-share sebagai **"Anyone with the link –
  Viewer"**, karena Function mengambilnya lewat endpoint publik Google
  Sheets. Yang membatasi akses BUKAN sharing spreadsheet, melainkan role
  check di dalam `get-bank-data.mts` sebelum data dikirim ke browser.
- Jangan hapus pengecekan `getUser()` dan pencocokan role di dalam
  `get-bank-data.mts` — di situlah letak proteksi sebenarnya, bukan di
  frontend (frontend hanya mengunci tampilan, mudah dilewati lewat
  DevTools kalau proteksi hanya di sana).
