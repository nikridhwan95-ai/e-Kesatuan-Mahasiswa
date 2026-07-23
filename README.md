# Portal Aktiviti Pelajar UPM

Portal bersepadu **e-Kesatuan Mahasiswa** (pengurusan permohonan aktiviti,
aliran kelulusan, laporan pascaprogram) + **Modul Bakat / Radar Bakat**
(kecerdasan bakat evidence-first). Dibina dengan Vite + React + Tailwind,
disokong oleh **Supabase** (Auth + Postgres + Storage + Edge Functions).

## Persediaan Supabase (sekali sahaja)

1. **Akaun log masuk portal** — Dashboard → Authentication → Users →
   **Add user** dengan e-mel `ekmupm@portal-bhep.upm.edu.my`, kata laluan
   portal, dan tandakan **Auto Confirm User**. Portal menggunakan log masuk
   nama pengguna + kata laluan (nama pengguna `ekmupm`).
2. **Tutup pendaftaran awam** — Dashboard → Authentication → Sign In /
   Providers → Email: MATIKAN **Allow new users to sign up** dan KEKALKAN
   **Confirm email**. (Penting: tanpa ini, sesiapa sahaja boleh mendaftar
   akaun terus melalui API awam.)
3. **Skema pangkalan data** — buka Supabase Dashboard → SQL Editor, tampal
   kandungan `supabase/schema.sql` dan jalankan **dua kali** (jalanan kedua
   mesti selesai tanpa ralat — bukti keidempotenan). Ia mencipta jadual
   (`users`, `applications`, `reports`, `presentation_sessions`, `settings`,
   `evidence`), polisi RLS, trigger integriti, kunci asing, baldi Storage
   `uploads` (PERIBADI — fail dicapai melalui URL bertandatangan), dan
   membenih peranan admin untuk akaun portal. Sebelum jalanan pertama pada
   data sedia ada, jalankan pertanyaan pra-jalanan (yatim + duplikat) yang
   disertakan sebagai komen dalam fail skema.
4. **Fungsi Edge AI (pilihan, untuk 'Jana Analisis AI')** —
   `supabase functions deploy jana-analisis` (Verify JWT: ON), kemudian
   `supabase secrets set GEMINI_API_KEY=<kunci>`. Kunci Gemini TIDAK
   pernah berada dalam kod klien.
5. **Redirect URL** — Authentication → URL Configuration → tambah URL app.

Konfigurasi klien berada dalam `src/supabase.ts` (boleh diatasi dengan
`VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` dalam `.env.local`).

## Jalankan Secara Tempatan

**Prasyarat:** Node.js

1. Pasang kebergantungan: `npm install`
2. Jalankan aplikasi: `npm run dev`

## Semakan & Binaan

- `npm run lint` — semakan jenis TypeScript (mod strict)
- `npm run lint:eslint` — ESLint (typescript-eslint + react-hooks)
- `npm run check:bakat` — 87 semakan sifat enjin skor, derivation,
  perancang import dan parser Modul Bakat
- `npm run build` — binaan pengeluaran (dipecah chunk; recharts dan xlsx
  dimuat malas)

Ketiga-tiga `lint`, `check:bakat` dan `build` dikuatkuasakan oleh CI
(`.github/workflows/ci.yml`) pada setiap push dan pull request.

## Dokumentasi

- `docs/HANDOFF.md` — nota serah tugas: keputusan yang telah dipersetujui,
  keadaan semasa, dan tindakan pemilik yang masih menunggu
- `docs/SCHEMA.md` — seni bina, skema data, dan titik integrasi Modul Bakat
- `supabase/schema.sql` — sumber kebenaran skema Postgres + RLS + trigger
