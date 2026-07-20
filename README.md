# Portal Aktiviti Pelajar UPM

Portal bersepadu **e-Kesatuan Mahasiswa** (pengurusan permohonan aktiviti,
aliran kelulusan, laporan pasca program) + **Modul Bakat / Radar Bakat**
(kecerdasan bakat evidence-first). Dibina dengan Vite + React + Tailwind,
disokong oleh **Supabase** (Auth + Postgres + Storage).

## Persediaan Supabase (sekali sahaja)

1. **Skema pangkalan data** — buka Supabase Dashboard → SQL Editor,
   tampal kandungan `supabase/schema.sql` dan jalankan. Ia mencipta jadual
   (`users`, `applications`, `reports`, `presentation_sessions`, `settings`,
   `evidence`), polisi RLS, dan baldi Storage `uploads`. Selamat dijalankan semula.
2. **Log masuk Google (pilihan)** — Dashboard → Authentication → Providers →
   Google → Enable, dan isikan Client ID/Secret dari Google Cloud Console.
   Tanpa langkah ini, pengguna masih boleh log masuk melalui **pautan e-mel
   (magic link)** yang berfungsi secara lalai.
3. **URL aplikasi** — Dashboard → Authentication → URL Configuration →
   tambah URL aplikasi anda (cth `http://localhost:3000`) dalam Redirect URLs.

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
