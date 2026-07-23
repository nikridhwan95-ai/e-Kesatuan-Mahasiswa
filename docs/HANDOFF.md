# NOTA SERAH TUGAS — Portal Aktiviti Pelajar UPM

> Dokumen ini ditulis untuk sesi/perbualan seterusnya memahami sepenuhnya apa
> yang telah berlaku. Baca dokumen ini SEBELUM membuat sebarang perubahan.
> Kemas kini terakhir: 2026-07-20.

## 1. Apa projek ini

**Portal Aktiviti Pelajar UPM** — portal bersepadu untuk Bahagian Hal Ehwal
Pelajar (BHEP) UPM yang menggabungkan DUA sistem yang saling berkait:

1. **e-Kesatuan Mahasiswa** — pengurusan permohonan aktiviti pelajar: borang
   kertas kerja → aliran kelulusan (Unit Semakan → Pembentangan → YDP MPP →
   TNC HEPA) → laporan pascaprogram disahkan Unit Pelaporan.
2. **Portal Bakat / Modul Bakat** (dari projek `portalbakatbhepupm`, SDD
   TalentOS v2.0) — kecerdasan bakat pelajar berasaskan **bukti** (evidence).

**Titik integrasi teras:** apabila permohonan mencapai `Lulus Sepenuhnya` DAN
laporannya `Disahkan`, sistem menjana rekod bukti bakat secara automatik
(`src/bakat/derive.ts`) — jawatan Pengarah/Setiausaha → Kepimpinan/Pengurusan
Projek/Literasi Kewangan, kategori 8 Teras → kompetensi teras, kemahiran
insaniah → kompetensi berkaitan, dengan pendarab peranan & peringkat.

- **Repo:** `nikridhwan95-ai/e-Kesatuan-Mahasiswa`
- **Branch kerja:** `claude/talent-hub-portal-integration-xvcdtn` (14 commit,
  semuanya di-push; BELUM digabung ke `main`, PR belum dibuat)
- **Bahasa UI:** Bahasa Melayu Malaysia piawaian DBP (lihat §7)

## 2. Susur masa kerja (14 commit)

| Commit    | Apa                                                                                         |
| --------- | ------------------------------------------------------------------------------------------- |
| `5e14207` | Integrasi Portal Bakat: enjin domain, derivation, UI bakat, jenama portal                   |
| `5e8f518` | Reka bentuk semula UI Bakat ikut mockup TALENT HUB (kad statistik, cincin, sorotan, donat)  |
| `360708a` | Baiki grid kad kompetensi (3 lajur)                                                         |
| `da2e459` | **Migrasi penuh Firebase → Supabase** (Auth + Postgres + Storage + RLS)                     |
| `96f2713` | Auth nama pengguna + kata laluan (buang Google OAuth)                                       |
| `6beab39` | Pembetulan bahasa DBP (kemas kini, pascaprogram, imperatif -kan, dll.)                      |
| `209e0a0` | Istilah: 'evidens' → **'bukti'**; 'Jana Bukti'; 'Faktor Masa'; 'Prospek Kepimpinan'         |
| `cdc527e` | Modul Import Excel (program lepas pukal)                                                    |
| `de00d35` | Sidebar 3 kumpulan: e-Kesatuan Mahasiswa / Portal Bakat / Tetapan Sistem                    |
| `3bb9dfc` | Radar bakat: papar HANYA kompetensi berskor, skala automatik                                |
| `0664cf9` | Revamp Analitik Data (baiki pepijat app.name, warna kategori tetap CVD-safe, bar bertindan) |
| `8028de1` | Analitik: 7 penapis + Sorotan Keputusan + jadual Prestasi Mengikut Teras                    |
| `23ba04b` | Import Data (Excel) dialihkan ke kumpulan Tetapan Sistem                                    |
| `b46bcf5` | Direktori Profil Pelajar + import Excel butiran pelajar + medan baharu users                |

## 3. Seni bina & susunan kod

Vite + React 19 + Tailwind v4 + TypeScript (tiada @types/react — komponen yang
menerima `key` mesti mengisytiharkannya dalam jenis props; sudah ada 2 contoh).
Backend: **Supabase** (projek `tmtjnkexvqlvdxrmnugb`, klien dalam
`src/supabase.ts` dengan publishable key — selamat untuk klien, kawalan akses
melalui RLS).

```
src/
  App.tsx                      # shell: auth, sidebar 3 kumpulan, routing tab
  supabase.ts                  # klien + usernameToEmail + AppUser
  types.ts                     # User/Application/Report (users kini ada studyYear/programme/address)
  services/
    dataService.ts             # SEMUA akses DB e-Kesatuan (API sama spt firestoreService lama)
    importParser.ts            # parser Excel TULEN (program + pelajar) — diuji
    importService.ts           # I/O import (importProgrammes, importStudents)
  bakat/
    domain/                    # enjin skor TULEN (types, taxonomy 16 kompetensi, multipliers, scoring, evidence)
    derive.ts                  # JAMBATAN e-Kesatuan → bukti (pemetaan jawatan/peringkat/kategori/kemahiran)
    evidenceService.ts         # jadual 'evidence' Supabase (sync idempotent, dispute)
    insights.ts                # skor keseluruhan, jalur, statistik kohort, sorotan
  components/
    bakat/                     # TalentRadar, BakatProfile, TalentSearchModule (Radar Bakat),
                               # StudentDirectoryModule (Profil Pelajar), ui.tsx (StatCard, ProgressRing...)
    import/ExcelImportModule.tsx  # 2 mod: Program Lepas / Butiran Pelajar
    admin/DataAnalyticsModule.tsx # Analitik Data (7 penapis, Sorotan Keputusan)
    ... (modul asal e-Kesatuan: application, review, presentation, report, dll.)
supabase/schema.sql            # SUMBER KEBENARAN skema Postgres + RLS + storage (idempotent)
scripts/check-bakat.ts         # 53 semakan sifat (enjin skor, derivation, parser import)
dev/mocksb.example.ts          # mock Supabase untuk verifikasi visual (lihat §8)
docs/SCHEMA.md                 # dokumentasi skema & integrasi
```

## 4. Konsep teras (JANGAN langgar)

- **IRON RULE (SDD §4.4):** skor kompetensi TIDAK PERNAH disimpan. Hanya
  jadual `evidence` (bukti) disimpan; skor sentiasa dikira semula oleh
  `src/bakat/domain/scoring.ts` daripada bukti berstatus `approved`.
- Bukti bersifat **tidak boleh diubah** — dispute hanya menukar status;
  penjanaan idempotent (ID deterministik `appId__sourceType__competency`,
  upsert ON CONFLICT DO NOTHING).
- **Skor Bakat Keseluruhan** = purata 3 skor kompetensi tertinggi. Jalur:
  Cemerlang ≥90 / Baik 70–89 / Berkembang 50–69 / Perlu Peningkatan <50.
  Potensi Tinggi ≥ 70.
- Semua statistik/sorotan dikira daripada **peraturan atas data sebenar** —
  tiada angka rekaan/AI (kecuali butang 'Jana Analisis AI' Gemini yang
  dilabel jelas).

## 5. Auth & keselamatan

- Log masuk: **nama pengguna + kata laluan sahaja**. Nama pengguna `ekmupm`
  dipetakan kepada akaun Supabase `ekmupm@portal-bhep.upm.edu.my`
  (`src/supabase.ts`). Kata laluan TIDAK disimpan dalam repo (sengaja —
  bundle klien boleh dibaca umum); ia ditetapkan oleh pemilik dalam
  perbualan asal & semasa mencipta akaun di Supabase.
- Akaun `ekmupm` + `nikridhwan95@gmail.com` = **master admin** (paksa peranan
  admin, pemilih peranan "Uji" di header untuk tukar paparan peranan).
- Model semasa: SATU akaun kongsi (mod urus setia). Pelajar TIDAK log masuk
  sendiri; rekod pelajar dicipta melalui Import Excel (uid sintetik
  `M-<matrik>`) atau aliran permohonan. Perbincangan lanjut: akaun individu
  boleh dibuka kemudian tanpa ubah seni bina.
- RLS dalam `supabase/schema.sql`: pelajar nampak/pertikai data sendiri
  sahaja; penjanaan bukti & import oleh peranan pengurusan/admin; kunci
  anti-naik-taraf peranan kendiri.

## 6. Ciri per modul (keadaan semasa)

- **Sidebar 3 kumpulan:** e-Kesatuan Mahasiswa (biru) / Portal Bakat (indigo)
  / Tetapan Sistem. Kumpulan tanpa item disembunyikan ikut peranan.
- **Radar Bakat (admin):** kad statistik, grid 16 kompetensi bercincin,
  jadual pelajar ikut skor, Sorotan Bakat, donat taburan, butang **Jana
  Bukti** (backfill idempotent, ada tooltip penerangan).
- **Profil Bakat (pelajar) / profil dalam admin:** skor keseluruhan + jalur,
  Kekuatan Utama (bar), Ringkasan Bakat, radar (HANYA kompetensi berskor,
  skala automatik gandaan 20, jadual jika <3 kompetensi), perincian bukti
  (jumlah sumbangan TEPAT = skor paksi), Aktiviti Program, Lejar Bukti,
  butang **Pertikaikan** (pelajar sahaja).
- **Profil Pelajar (admin, Portal Bakat):** direktori semua pelajar + klik →
  halaman profil penuh (butiran diri / Program e-Kesatuan / Profil Bakat).
- **Analitik Data (admin):** 7 penapis (Teras, Sesi, Semester, Tahun,
  Peringkat, Status, Impak) + Set Semula; 5 kad statistik; **Sorotan
  Keputusan** (setiap satu ada "Tindakan:"); donat + bar bertindan (warna
  TETAP per kategori, lulus semakan buta warna deutan ΔE 16.7 — palet dalam
  `CATEGORY_COLORS`); jadual Prestasi Mengikut Teras (kos seorang peserta);
  matriks peserta; kewangan semester (peruntukan RM200,000/semester =
  `SEMESTER_ALLOCATION`); Jana Analisis AI (Gemini) dikekalkan.
- **Import Data (Excel) (admin, Tetapan):** 2 mod dengan templat muat turun —
  (a) **Program Lepas**: baris → pelajar + permohonan Lulus Sepenuhnya +
  laporan Disahkan + bukti bakat; anti-penduaan matrik+tajuk+tarikh;
  (b) **Butiran Pelajar**: cipta/kemas kini pelajar padanan matrik.
  Kedua-duanya: pratonton dengan ralat/amaran per baris, bar kemajuan,
  ringkasan keputusan.
- **ReportModule:** pengesahan laporan (Disahkan) auto-jana bukti bakat.

## 7. Piawaian bahasa (DBP) — kekalkan

'kemas kini' (dua perkataan) · 'pascaprogram' (dirangkai) · **'bukti'** bukan
'evidence/evidens' dalam teks UI (pengecam kod & jadual DB kekal `evidence`) ·
imperatif dengan -kan (Pertikaikan, Paparkan, Segerakkan→'Jana Bukti') ·
'daripada' untuk sumber · 'baharu' utk new · elak '&' dalam ayat · label
'Faktor Masa' (pendarab susutan 24 bulan separuh hayat) · 'Prospek
Kepimpinan'. Kategori data 'Akademik & Intelektual' TIDAK diubah (nilai
tersimpan, kunci pemetaan).

## 8. Cara verifikasi (WAJIB sebelum push)

```bash
npm run lint          # tsc --noEmit
npm run check:bakat   # 53 semakan sifat — semua mesti LULUS
npm run build         # vite build
```

**Verifikasi visual tanpa Supabase sebenar** (sandbox menyekat supabase.co):

1. `cp dev/mocksb.example.ts src/mocksb.ts`
2. Tambah alias SEMENTARA dalam `vite.config.ts` → `resolve.alias`:
   `'@supabase/supabase-js': path.resolve(__dirname, 'src/mocksb.ts'),`
3. `npm run dev` → app log masuk automatik sebagai admin (Sarah) dengan data
   contoh; pemilih peranan "Uji" di header untuk tukar paparan.
4. Playwright + `executablePath: '/opt/pw-browsers/chromium'` untuk
   tangkapan skrin.
5. **WAJIB pulihkan**: buang alias, `rm src/mocksb.ts`, jalankan semula lint
   sebelum commit. Jangan sesekali commit mock/alias.

## 9. Persediaan yang MASIH MENUNGGU tindakan pemilik

1. **Jalankan `supabase/schema.sql`** dalam Supabase Dashboard → SQL Editor
   (idempotent; perlu diulang selepas commit `b46bcf5` untuk lajur baharu
   `studyYear`/`programme`/`address` dan polisi import admin).
2. **Cipta akaun portal**: Authentication → Users → Add user →
   `ekmupm@portal-bhep.upm.edu.my` + kata laluan yang dipersetujui + tandakan
   Auto Confirm. (Atau matikan 'Confirm email' untuk auto-provision.)
3. **Redirect URL**: Authentication → URL Configuration → tambah URL app.
4. **Ujian hujung-ke-hujung sebenar** di mesin pemilik (kitaran permohonan →
   kelulusan → laporan → bukti) — belum pernah diuji terhadap Supabase
   sebenar kerana proxy sandbox menyekatnya.
5. **Gabung ke `main` / buat PR** — belum dibuat, tunggu arahan pemilik.
6. **Deploy** (Netlify/Vercel — app Vite statik).

## 10. Perkara yang dipersetujui pemilik (jangan buka semula)

Mock-data → Supabase (selesai) · gaya UI TALENT HUB dengan angka BENAR sahaja
· satu akaun kongsi ekmupm · BM sahaja, tema cerah · 'bukti' sebagai istilah ·
radar papar kompetensi berskor sahaja · import diletakkan di Tetapan Sistem.

## 11. Idea seterusnya (belum diminta, jangan buat tanpa arahan)

Input bukti manual oleh HEP (sijil/pertandingan luar sistem) · janaan PDF
surat kelulusan · notifikasi e-mel · trend semester Radar Bakat (perlu
sejarah snapshot) · akaun log masuk individu pelajar · migrasi data Firebase
lama (jika ada).
