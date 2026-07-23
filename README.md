# Portal Aktiviti Pelajar UPM

Portal bersepadu **e-Kesatuan Mahasiswa** (pengurusan permohonan aktiviti,
aliran kelulusan, laporan pascaprogram) + **Modul Bakat / Radar Bakat**
(kecerdasan bakat evidence-first). Dibina dengan Vite + React + Tailwind,
disokong oleh **Supabase** (Auth + Postgres + Storage).

## Persediaan Supabase (sekali sahaja)

1. **Skema pangkalan data** — buka Supabase Dashboard → SQL Editor,
   tampal kandungan `supabase/schema.sql` dan jalankan. Ia mencipta jadual
   (`users`, `applications`, `reports`, `presentation_sessions`, `settings`,
   `evidence`), polisi RLS, dan baldi Storage `uploads`. Selamat dijalankan semula.
2. **Akaun log masuk portal** — portal menggunakan log masuk nama pengguna +
   kata laluan (nama pengguna `ekmupm`). Di sebalik tabir ia adalah akaun
   e-mel Supabase `ekmupm@portal-bhep.upm.edu.my`. Pilih SATU cara:
   - _Automatik:_ Dashboard → Authentication → Sign In / Providers → Email →
     matikan **Confirm email**. Log masuk pertama akan mencipta akaun sendiri.
   - _Manual:_ Dashboard → Authentication → Users → **Add user** dengan e-mel
     `ekmupm@portal-bhep.upm.edu.my`, kata laluan portal, dan tandakan
     **Auto Confirm User**.

Konfigurasi klien berada dalam `src/supabase.ts` (boleh diatasi dengan
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` dalam `.env.local`).

## Jalankan Secara Tempatan

**Prasyarat:** Node.js

1. Pasang kebergantungan: `npm install`
2. (Pilihan, untuk ringkasan AI) Tetapkan `GEMINI_API_KEY` dalam `.env.local`
3. Jalankan aplikasi: `npm run dev`

## Semakan & Binaan

- `npm run lint` — semakan jenis TypeScript
- `npm run check:bakat` — 34 semakan sifat enjin skor & derivation Modul Bakat
- `npm run build` — binaan pengeluaran

## Dokumentasi

- `docs/SCHEMA.md` — seni bina, skema data, dan titik integrasi Modul Bakat
- `supabase/schema.sql` — sumber kebenaran skema Postgres + RLS
