# NOTA SERAH TUGAS — Portal Aktiviti Pelajar UPM

> Dokumen ini ditulis untuk sesi/perbualan seterusnya memahami sepenuhnya apa
> yang telah berlaku. Baca dokumen ini SEBELUM membuat sebarang perubahan.
> Kemas kini terakhir: 2026-07-23 (selepas audit penuh + remediasi 8 fasa).

## 1. Apa projek ini

**Portal Aktiviti Pelajar UPM** — portal bersepadu untuk Bahagian Hal Ehwal
Pelajar (BHEP) UPM yang menggabungkan DUA sistem yang saling berkait:

1. **e-Kesatuan Mahasiswa** — pengurusan permohonan aktiviti pelajar: borang
   kertas kerja → aliran kelulusan (Unit Semakan → Pembentangan → YDP MPP →
   TNC HEPA) → laporan pascaprogram disahkan Unit Pelaporan.
2. **Portal Bakat / Radar Bakat** (SDD TalentOS v2.0) — kecerdasan bakat
   pelajar berasaskan **bukti** (evidence-first).

- **Repo:** `nikridhwan95-ai/e-Kesatuan-Mahasiswa`
- **Status branch:** audit penuh + remediasi 8 fasa (branch
  `claude/init-v6w4pq`) telah DIGABUNG ke `main` melalui PR #7; kerja
  baharu dibuat pada branch `claude/*` baharu daripada `main`
- **Bahasa UI:** Bahasa Melayu Malaysia piawaian DBP (lihat §7)
- Seni bina terperinci: `docs/SCHEMA.md` (telah ditulis semula — kini tepat)

## 2. Audit penuh + remediasi (kini dalam `main`)

Audit tiga dimensi (keselamatan/backend, frontend, enjin/peralatan)
menemui ~45 isu; kesemuanya ditangani dalam 8 fasa (satu siri komit per
fasa — lihat `git log` untuk butiran):

| Fasa | Ringkasan                                                                                                                                                                                                                                                                                                                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Kod mati dibuang (types/index.ts lama, FacultyCollegeSettings, summarizer AI mati, peranan 'advisor' tidak sah); 5 kebergantungan tidak digunakan dibuang; @types/react + TypeScript **strict** (hijau); ESLint + Prettier; **CI GitHub Actions**                                                                                                              |
| 2    | **is_admin() tidak lagi mempercayai e-mel dikod keras** (vektor rampasan admin ditutup); peranan dibenih dari DB; **baldi Storage kini PERIBADI** dengan URL bertandatangan (PII pelajar tidak lagi terdedah awam); signUp automatik dibuang                                                                                                                   |
| 3    | Trigger integriti DB (anti-pemalsuan medan/status, INSERT tanpa kelulusan kendiri, bukti tidak boleh ubah); kunci asing NOT VALID+VALIDATE; kekangan CHECK/UNIQUE; senarai putih medan klien; unjuran lajur (senarai pengguna tanpa telefon/alamat); pembersihan yatim semasa padam                                                                            |
| 4    | **Kunci Gemini dialihkan ke Fungsi Edge `jana-analisis`** (JWT + semakan peranan, prompt sisi pelayan) — kunci tidak lagi dibina ke dalam bundle awam                                                                                                                                                                                                          |
| 5    | Enjin tahan input rosak (NaN decay/attendance → neutral 1, klamp points 0–10); **overallScore = purata bukan-sifar top-3** (1 kompetensi @90 → 90, bukan 30 — perubahan paparan!); asOf boleh disuntik; import selamat-gagal (perancang tulen importPlan.ts, padam-semula pada kegagalan laporan, butang **Pulihkan Import**); **check:bakat 53 → 87 semakan** |
| 6    | Pepijat sebenar dibaiki: tarikh semakan yang dipilih pentadbir kini DISIMPAN; garis masa tarikh rekaan "10–16 Okt" → cap masa sebenar; surat rasmi mencetak tempat sebenar; medan Tarikh Tamat baharu; ToastProvider/ConfirmDialog/ErrorBoundary berkongsi; semua alert/confirm/prompt asli dibuang; keadaan ralat 'Cuba Semula'                               |
| 7    | ApplicationModule 1797 baris → 5 komponen; Tetapan Sistem diekstrak dari App.tsx (841 → ~580 baris); StatusBadge berkongsi (6 pelaksanaan → 1); constants.ts (peruntukan + palet CVD-safe); UI palsu dibuang (penomboran mati, butang tanpa fungsi); penapis carian/status diwayarkan                                                                          |
| 8    | React.lazy semua tab + manualChunks + xlsx dinamik: **bundle awal 1,855 KB → 218 KB** (recharts/xlsx dimuat atas permintaan); cache TTL ringan (getUsers ×7 pendua dihapuskan); favicon + meta; dokumentasi ditulis semula                                                                                                                                     |

## 3. Konsep teras (JANGAN langgar)

- **IRON RULE (SDD §4.4):** skor kompetensi TIDAK PERNAH disimpan. Hanya
  jadual `evidence` disimpan; skor sentiasa dikira semula oleh
  `src/bakat/domain/scoring.ts` daripada bukti berstatus `approved`.
  Kini turut dikuatkuasakan di DB oleh trigger `guard_evidence_update`.
- Bukti **tidak boleh diubah** — dispute hanya menukar status; penjanaan
  idempotent (ID deterministik, ON CONFLICT DO NOTHING).
- **Skor Bakat Keseluruhan** = purata skor BUKAN SIFAR dalam kalangan 3
  kompetensi tertinggi (BERUBAH pada 2026-07-23 — sebelum ini dipenuhkan
  sifar sehingga profil sempit terhukum; skor keseluruhan dan bilangan
  Potensi Tinggi akan NAIK untuk profil sempit). Jalur: Cemerlang ≥90 /
  Baik 70–89 / Berkembang 50–69 / Perlu Peningkatan <50; Potensi Tinggi ≥70.
- INN, TEC, GLO, NEG tiada laluan derivation — manual-endorsement-sahaja
  (masa hadapan); paksi radar mereka kekal 0.
- Semua statistik dikira daripada peraturan atas data sebenar — tiada angka
  rekaan; satu-satunya kandungan AI ialah 'Jana Analisis AI' (kini melalui
  Fungsi Edge).

## 4. Model keselamatan (SELEPAS pengukuhan)

- Log masuk: nama pengguna `ekmupm` → `ekmupm@portal-bhep.upm.edu.my`.
  **Pendaftaran awam MESTI dimatikan di Dashboard** (lihat §6). Peranan
  admin datang HANYA daripada `users.role` yang dibenih oleh
  `supabase/schema.sql` — TIADA lagi e-mel dikod keras (gmail peribadi
  pemilik tidak lagi admin automatik; beri peranan melalui UI Pengurusan
  Peranan selepas log masuk sebagai akaun portal).
- Baldi `uploads` PERIBADI: semua fail melalui URL bertandatangan 1 jam;
  rekod lama dengan URL awam penuh masih berfungsi (getFileUrl menghurai
  kedua-duanya) tetapi URL awam lama TIDAK lagi boleh dibuka tanpa log
  masuk selepas skema dijalankan.
- Pemilih peranan "Uji" di header (admin sahaja) hanya menukar PAPARAN —
  ia tidak pernah menjadi kawalan keselamatan; kawalan sebenar ialah RLS +
  trigger.
- Kunci Gemini: rahsia Fungsi Edge sahaja. **Sebarang kunci yang pernah
  dibina ke dalam bundle awam sebelum fasa ini WAJIB dibatalkan (rotate).**

## 5. Cara verifikasi (WAJIB sebelum push)

```bash
npm run lint          # tsc --noEmit (strict)
npm run check:bakat   # 87 semakan sifat — semua mesti LULUS
npm run build         # vite build (dipecah chunk)
npx eslint src scripts  # 0 ralat (amaran dibenarkan)
```

CI (`.github/workflows/ci.yml`) menguatkuasakan kesemuanya pada push/PR.

**Verifikasi visual tanpa Supabase sebenar** (sandbox menyekat supabase.co):
prosedur mock dalam §8 fail ini masih sama (cp `dev/mocksb.example.ts` →
`src/mocksb.ts` + alias vite SEMENTARA), TETAPI mock itu ditulis sebelum
fasa remediasi — ia belum melaksanakan `storage.createSignedUrl` dan
`functions.invoke`, jadi pautan fail dan butang AI akan menunjukkan keadaan
ralat (bukan ranap; FileLink/AnalyticsDashboard menangkap kegagalan).
Kemas kini mock itu dahulu jika verifikasi visual penuh diperlukan.

## 6. Persediaan yang MASIH MENUNGGU tindakan pemilik (IKUT TURUTAN)

1. **Cipta akaun auth portal** (jika belum): Authentication → Users →
   Add user → `ekmupm@portal-bhep.upm.edu.my` + kata laluan + Auto Confirm.
2. **MATIKAN pendaftaran awam**: Authentication → Sign In / Providers →
   Email → matikan "Allow new users to sign up"; KEKALKAN "Confirm email".
   (Kritikal — menutup vektor rampasan akaun.)
3. **Jalankan pertanyaan pra-jalanan** dalam komen `supabase/schema.sql`
   (baris yatim + e-mel/matrik duplikat); bersihkan sebarang hasil.
4. **Jalankan `supabase/schema.sql` DUA KALI** dalam SQL Editor — jalanan
   kedua mesti selesai tanpa ralat (bukti keidempotenan). Ini turut menukar
   baldi kepada peribadi dan membenih peranan admin akaun portal.
5. **Deploy Fungsi Edge**: `supabase functions deploy jana-analisis`
   (Verify JWT ON) + `supabase secrets set GEMINI_API_KEY=...`;
   **rotate kunci Gemini lama** yang pernah berada dalam bundle awam.
6. **Ujian asap**: log masuk (peranan admin muncul tanpa paksaan klien);
   buka pautan kertas kerja lama (URL bertandatangan berfungsi); tampal URL
   awam lama dalam tab incognito (mesti DITOLAK); cuba kemas kini
   `approvedAmount` dari konsol pelayar semasa "Uji: Pelajar" (trigger
   mesti menolak); klik kedua-dua butang 'Jana Analisis AI'.
7. **Ujian hujung-ke-hujung penuh** (permohonan → kelulusan → laporan →
   bukti) — belum pernah diuji terhadap Supabase sebenar dari sandbox.
8. **Gabung ke `main`** — SELESAI (PR #7 digabung pada 2026-07-23).
9. **Deploy** (Netlify/Vercel — app Vite statik).

## 7. Piawaian bahasa (DBP) — kekalkan

'kemas kini' (dua perkataan) · 'pascaprogram' (dirangkai) · **'bukti'** bukan
'evidence/evidens' dalam teks UI (pengecam kod & jadual DB kekal `evidence`) ·
imperatif dengan -kan (Pertikaikan, Paparkan) · 'daripada' untuk sumber ·
'baharu' utk new · elak '&' dalam ayat · label 'Faktor Masa' (susutan 24
bulan separuh hayat) · 'Prospek Kepimpinan' · kategori 'Akademik &
Intelektual' TIDAK diubah (nilai tersimpan, kunci pemetaan).

## 8. Verifikasi visual dengan mock (prosedur)

1. `cp dev/mocksb.example.ts src/mocksb.ts`
2. Tambah alias SEMENTARA dalam `vite.config.ts` → `resolve.alias`:
   `'@supabase/supabase-js': path.resolve(__dirname, 'src/mocksb.ts'),`
3. `npm run dev` → log masuk automatik sebagai admin dengan data contoh.
4. Playwright + `executablePath: '/opt/pw-browsers/chromium'`.
5. **WAJIB pulihkan**: buang alias, `rm src/mocksb.ts`, jalankan semula
   lint sebelum commit. Jangan sesekali commit mock/alias.
   (Lihat kaveat mock dalam §5.)

## 9. Perkara yang dipersetujui pemilik (jangan buka semula)

Satu akaun kongsi ekmupm yang DIKUKUHKAN (bukan akaun individu) · Gemini
melalui Fungsi Edge · remediasi penuh 8 fasa · BM sahaja, tema cerah ·
'bukti' sebagai istilah · radar papar kompetensi berskor sahaja · import di
Tetapan Sistem · UI TALENT HUB dengan angka BENAR sahaja.

## 10. Tertangguh secara sengaja (dengan sebab — jangan "baiki" tanpa fikir)

- **Lajur tarikh kekal `text`**: cast in-place atas format campuran tidak
  dapat disahkan tanpa akses DB sebenar; dikurangkan oleh parseTarikh /
  normalizeDate. Timbang semula hanya dengan snapshot DB di tangan.
- **`react-hooks/exhaustive-deps` kekal 'warn'** (8 amaran corak
  fetchData-dalam-effect yang stabil); naikkan ke 'error' selepas corak itu
  di-refactor (useCallback) — jangan naikkan selagi CI akan gagal.
- **Penomboran pelayan** belum ada (unjuran lajur sudah memotong muatan).
- **FK `evidence.source_id`** sengaja tiada (bukti manual masa hadapan).
- **Mock `dev/mocksb.example.ts`** belum tahu createSignedUrl /
  functions.invoke (lihat §5).

## 11. Idea seterusnya (belum diminta, jangan buat tanpa arahan)

Input bukti manual oleh HEP (mengisi INN/TEC/GLO/NEG) · notifikasi e-mel ·
trend semester Radar Bakat (perlu sejarah snapshot) · akaun log masuk
individu pelajar (reka bentuk RLS/trigger sedia menampung) · migrasi
tarikh `text` → `timestamptz` · penomboran pelayan.
