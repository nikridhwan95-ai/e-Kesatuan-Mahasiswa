# Portal Aktiviti Pelajar UPM — Seni Bina & Skema

Portal bersepadu yang menggabungkan dua modul yang saling berkait:

1. **e-Kesatuan Mahasiswa** — pengurusan permohonan aktiviti, aliran kelulusan
   (Unit Semakan → Pembentangan → YDP → TNC HEPA) dan laporan pascaprogram.
2. **Modul Bakat (Radar Bakat)** — kecerdasan bakat pelajar berasaskan prinsip
   *evidence-first* (SDD TalentOS v2.0): skor kompetensi TIDAK PERNAH disimpan
   (IRON RULE §4.4); setiap skor diterbitkan semula oleh enjin deterministik
   (`src/bakat/domain/scoring.ts`) daripada rekod bukti yang tidak boleh diubah.

Backend: **Supabase** (Auth + Postgres + Storage + Edge Functions). Sumber
kebenaran skema ialah **`supabase/schema.sql`** — idempotent; pemilik
menjalankannya semula dalam SQL Editor selepas setiap perubahan skema.

## 1. Susunan kod

```
src/
  App.tsx                      # shell: auth, sidebar 3 kumpulan, penghalaan tab (React.lazy)
  supabase.ts                  # klien + usernameToEmail + AppUser
  types.ts                     # SATU-SATUNYA fail jenis e-Kesatuan (status BM)
  constants.ts                 # SEMESTER_ALLOCATION + palet kategori (CVD-safe)
  services/
    dataService.ts             # SEMUA akses DB e-Kesatuan (unjuran lajur eksplisit,
                               # senarai putih medan, uploadFile/getFileUrl bertandatangan)
    importParser.ts            # parser Excel TULEN (diuji check:bakat)
    importPlan.ts              # perancang import TULEN (penduaan, padanan, ID)
    importService.ts           # pelaksana import + reconcileImportOrphans
    cache.ts                   # cache TTL ringan (users/tetapan/bukti)
  bakat/
    domain/                    # enjin skor TULEN — satu-satunya penghasil CompetencyScore
    derive.ts                  # JAMBATAN e-Kesatuan → bukti (fungsi total, tiada lempar)
    evidenceService.ts         # jadual 'evidence' (sync idempotent, dispute)
    insights.ts                # skor keseluruhan, jalur, statistik kohort (asOf boleh disuntik)
  components/
    shared/                    # StatusBadge, FileLink, ToastProvider, ConfirmDialog, ErrorBoundary
    application/               # ApplicationModule (orkestrator) + List/Detail/Form/Timeline
    ... (review, presentation, report, archive, dashboard, admin, bakat, import, settings)
supabase/
  schema.sql                   # SUMBER KEBENARAN: jadual + RLS + trigger + FK + storage + benih
  functions/jana-analisis/     # Fungsi Edge Gemini (kunci API di sisi pelayan)
scripts/check-bakat.ts         # 87 semakan sifat
```

## 2. Model keselamatan

- **Auth**: SATU akaun portal kongsi — nama pengguna `ekmupm` dipetakan ke
  e-mel sintetik `ekmupm@portal-bhep.upm.edu.my`. Pendaftaran awam DIMATIKAN
  di Dashboard. Peranan datang HANYA daripada `users.role` (dibenih oleh
  skema untuk akaun portal) — tiada e-mel dikod keras dalam `is_admin()`.
- **RLS** pada semua jadual (`to authenticated`); kunci anon tidak boleh
  menyentuh apa-apa jadual mahupun Storage.
- **Trigger integriti** (pertahanan dalam kedalaman, bersedia untuk akaun
  pelajar individu): pemohon tidak boleh mengubah medan terkawal
  (`approvedAmount`, `reviewerComment`, medan pembentangan) atau melompat
  status; polisi INSERT menyekat kelulusan/pengesahan kendiri; bukti tidak
  boleh diubah selain `status` (+ `superseded_by` oleh pengurusan).
- **Kunci asing**: `reports.applicationId → applications` (CASCADE),
  `applications.applicantId → users` (RESTRICT), `evidence.student_id →
  users` (RESTRICT). TIADA FK pada `evidence.source_id` — rujukan polimorfik
  untuk bukti manual/pengesahan masa hadapan.
- **Storage**: baldi `uploads` PERIBADI; muat naik terhad kepada prefiks
  `applications/`, `reports/`, `settings/`; objek tidak boleh ditulis ganti;
  capaian melalui URL bertandatangan 1 jam (`getFileUrl`, menyokong URL awam
  lama dalam rekod sedia ada).
- **AI**: Fungsi Edge `jana-analisis` memegang `GEMINI_API_KEY` sebagai
  rahsia, mengesahkan JWT + peranan pengurusan, dan membina prompt di sisi
  pelayan — kunci tidak pernah sampai ke pelayar.

## 3. Jadual (Postgres)

Lajur e-Kesatuan menggunakan camelCase dipetik supaya SAMA dengan jenis
TypeScript (tiada lapisan pemetaan); jadual `evidence` menggunakan
snake_case selaras `src/bakat/domain/types.ts`. Nilai status/peranan
dikawal kekangan CHECK yang sepadan dengan union literal `src/types.ts`.

| Jadual | Nota |
|---|---|
| `users` | uid PK (auth uid atau sintetik `M-<matrik>` untuk pelajar import); `role` CHECK 8 peranan; indeks unik `lower(email)` + `matricNumber` |
| `applications` | id `KM.<sesi>.<seq>`; status CHECK 11 nilai BM; medan penuh borang termasuk `startDate`/`endDate` (julat), medan pembentangan; lajur legasi `"aiSummary"` kekal dalam DB tetapi tidak dibaca aplikasi |
| `reports` | laporan pascaprogram; status `Tertunggak/Dihantar/Disahkan/Perlu Pembetulan`; FK CASCADE ke applications |
| `presentation_sessions` | sesi semakan; status `Open/Closed` |
| `settings` | baris fleksibel `id → data jsonb` (kategori, fakulti, kolej, surat) |
| `evidence` | IRON RULE — hanya bukti disimpan, skor tidak. ID deterministik `{appId}__{sourceType}__{competency}`; status `pending/approved/disputed/void` (hanya `approved` menyumbang) |

## 4. Titik integrasi Modul Bakat

Apabila permohonan mencapai `Lulus Sepenuhnya` DAN laporannya `Disahkan`,
bukti bakat dijana secara automatik (`src/bakat/derive.ts` — fungsi tulen):

- Jawatan pemohon (Pengarah/Setiausaha) → bukti `committee_role` untuk
  LEA, PRJ dan FIN (jika berbajet), pendarab chairperson ×1.8 / secretary ×1.45.
- Peringkat penganjuran → pendarab peringkat (Antarabangsa ×1.8, Kebangsaan
  & Negeri ×1.5, Universiti ×1.2, Kolej/Fakulti ×1.0).
- Kategori program (8 Teras) → bukti `achievement` kompetensi teras.
- Kemahiran insaniah → bukti `achievement` kompetensi berkaitan.

Penjanaan idempotent (ID deterministik + ON CONFLICT DO NOTHING). Pelajar
boleh mempertikai bukti (status → `disputed`) dan skor dikira semula tanpa
bukti itu.

**Formula**: skor = min(100, Σ points × peranan × peringkat × kehadiran ×
Faktor Masa), dengan skala-turun berkadar pada cap per-jenis-sumber. `points`
diklamp 0–10; tarikh/nilai tidak sah → faktor neutral 1. **Skor Bakat
Keseluruhan = purata skor BUKAN SIFAR dalam kalangan 3 kompetensi tertinggi**
(profil sempit tidak dicairkan). Jalur: Cemerlang ≥90 / Baik 70–89 /
Berkembang 50–69 / Perlu Peningkatan <50; Potensi Tinggi ≥70.

**Liputan kompetensi**: derivation e-Kesatuan mampu mengisi
{LEA, PRJ, FIN, VOL, ART, SPO, ENT, RES, COM, CRT, NET, DIG}. Empat
kompetensi — **INN, TEC, GLO, NEG** — tiada laluan derivation dan hanya akan
terisi melalui bukti manual/pengesahan (`manual_endorsement`) pada masa
hadapan; paksi radar mereka kekal 0 sehingga itu.

## 5. Import Excel

Dua mod (Tetapan Sistem → Import Data): **Program Lepas** (baris → pelajar +
permohonan Lulus Sepenuhnya + laporan Disahkan + bukti) dan **Butiran
Pelajar** (padanan matrik). Keputusan penduaan/padanan/ID dibuat oleh
perancang tulen `importPlan.ts` (diuji). Kegagalan separa tidak meninggalkan
yatim kekal: laporan gagal → permohonan dipadam semula; baki lama boleh
dipulihkan dengan butang **Pulihkan Import** (`reconcileImportOrphans`,
mengenal pasti baris import melalui penanda `IMPORT_MARKER`).

## 6. Perkara tertangguh (sengaja)

| Item | Sebab |
|---|---|
| Lajur tarikh `text` → `timestamptz` | Cast in-place atas format campuran tidak dapat disahkan tanpa akses DB; dikurangkan oleh pengesahan huraian (parseTarikh, normalizeDate) |
| Penomboran pelayan | Unjuran lajur telah memotong muatan; bar penomboran palsu dibuang |
| FK `evidence.source_id` | Menyekat bukti manual masa hadapan (rujukan bukan-permohonan) |
| Akaun log masuk pelajar individu | Keputusan pemilik; reka bentuk RLS/trigger sedia menampungnya |
