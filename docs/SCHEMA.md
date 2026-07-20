# Portal Aktiviti Pelajar UPM

Portal bersepadu yang menggabungkan dua modul yang saling berkait:

1. **e-Kesatuan Mahasiswa** — pengurusan permohonan aktiviti, aliran kelulusan
   (Unit Semakan → Pembentangan → YDP → TNC HEPA) dan laporan pasca program.
2. **Modul Bakat (Talent Hub)** — kecerdasan bakat pelajar berasaskan prinsip
   *evidence-first* (SDD TalentOS v2.0): skor kompetensi TIDAK PERNAH disimpan
   sebagai kebenaran (IRON RULE §4.4); setiap skor diterbitkan semula oleh enjin
   deterministik (`src/bakat/domain/scoring.ts`) daripada rekod evidence yang
   tidak boleh diubah.

**Titik integrasi:** apabila satu permohonan mencapai status `Lulus Sepenuhnya`
DAN laporan pasca programnya `Disahkan` oleh Unit Pelaporan, sistem menjana
rekod evidence bakat secara automatik (`src/bakat/derive.ts`):

- Jawatan pemohon (Pengarah/Setiausaha) → evidence `committee_role` untuk
  Kepimpinan (LEA), Pengurusan Projek (PRJ) dan Literasi Kewangan (FIN, jika
  berbajet), dengan pendarab peranan (chairperson ×1.8 / secretary ×1.45).
- Peringkat penganjuran → pendarab peringkat (Antarabangsa ×1.8, Kebangsaan &
  Negeri ×1.5, Universiti ×1.2, Kolej/Fakulti ×1.0).
- Kategori program (8 Teras) → evidence `achievement` kompetensi teras
  (cth Sukan → SPO, Kesukarelawanan → VOL).
- Kemahiran insaniah yang dideklarasikan → evidence `achievement` kompetensi
  berkaitan (cth Kemahiran Berkomunikasi → COM).

ID evidence adalah deterministik (`appId__sourceType__competency`) supaya
penjanaan semula bersifat idempotent. Pelajar boleh **mempertikai** evidence
(status → `disputed`) dan skor dikira semula serta-merta tanpa evidence itu.
Semakan sifat enjin: `npm run check:bakat`.

## 1. Struktur Folder Projek

\`\`\`
/src
  /components
    /auth               # Komponen log masuk & pendaftaran
    /dashboard          # Papan pemuka untuk pelbagai peranan
    /application        # Borang permohonan & muat naik kertas kerja
    /approval           # Aliran kelulusan (ApprovalWorkflow.tsx)
    /report             # Modul pelaporan pasca-program
    /bakat              # UI Modul Bakat (TalentRadar, BakatProfile, TalentSearchModule)
    /ui                 # Komponen UI guna semula (Butang, Modal, Kad)
  /bakat
    /domain             # Enjin bakat TULEN (types, taxonomy, multipliers, scoring, evidence)
    derive.ts           # Jambatan: Application+Report e-Kesatuan → Evidence[]
    evidenceService.ts  # Servis Firestore koleksi 'evidence' (sync idempotent, dispute)
  /services
    /firebase           # Konfigurasi & fungsi Firestore/Storage
    /ai                 # Integrasi API Google Gemini (summarizer.ts)
  /types                # Definisi TypeScript (index.ts)
  /utils                # Fungsi utiliti (format tarikh, penjanaan PDF)
  /hooks                # Custom React Hooks (useAuth, useApplication)
  /context              # React Context (AuthContext)
\`\`\`

## 2. Skema Pangkalan Data (Supabase / Postgres)

Sistem ini menggunakan **Supabase** (Postgres + Auth + Storage). Sumber
kebenaran skema ialah **\`supabase/schema.sql\`** — jalankan sekali dalam
Supabase Dashboard → SQL Editor. Nama lajur camelCase (dipetik) dipilih
supaya sama dengan jenis TypeScript aplikasi, jadi lapisan servis
(\`src/services/dataService.ts\`) tidak memerlukan pemetaan medan. Kawalan
akses dikuatkuasakan oleh polisi RLS dalam fail skema yang sama; muat naik
fail menggunakan baldi Storage \`uploads\`.

Senarai "koleksi" di bawah kini merujuk kepada JADUAL Postgres dengan medan
yang sama (jadual \`presentationSessions\` dinamakan \`presentation_sessions\`;
\`settings\` ialah jadual baris fleksibel \`id → data jsonb\`).

### Koleksi: \`users\`
Menyimpan profil pengguna dan kawalan akses berasaskan peranan (RBAC).
- \`uid\` (String) - ID unik dari Firebase Auth
- \`name\` (String) - Nama penuh
- \`email\` (String) - E-mel universiti
- \`role\` (String) - \`student\` | \`reviewer\` | \`secretariat\` | \`ydp\` | \`tnc\`
- \`faculty\` (String, Pilihan)
- \`association\` (String, Pilihan) - Persatuan pelajar
- \`position\` (String, Pilihan) - Jawatan dalam persatuan
- \`createdAt\` (Timestamp)

### Koleksi: \`applications\`
Menyimpan maklumat utama permohonan program.
- \`id\` (String) - ID Permohonan
- \`studentId\` (String) - Rujukan ke \`users.uid\`
- \`title\` (String) - Tajuk program
- \`date\` (Timestamp) - Tarikh cadangan program
- \`budget\` (Number) - Jumlah bajet dimohon
- \`objective\` (String) - Objektif program
- \`status\` (String) - Status semasa (Rujuk \`ApplicationStatus\` di \`types/index.ts\`)
- \`paperUrl\` (String) - Pautan ke fail PDF terkini di Firebase Storage
- \`aiSummary\` (Map, Pilihan) - Ringkasan janaan AI
  - \`executiveSummary\` (String)
  - \`budgetAnalysis\` (String)
  - \`impact\` (String)
- \`presentationDate\` (Timestamp, Pilihan)
- \`createdAt\` (Timestamp)
- \`updatedAt\` (Timestamp)

### Koleksi: \`application_versions\` (Sub-koleksi atau Koleksi Berasingan)
Menguruskan kawalan versi kertas kerja (Version Control).
- \`id\` (String)
- \`applicationId\` (String) - Rujukan ke \`applications.id\`
- \`version\` (Number) - Nombor versi (1, 2, 3...)
- \`paperUrl\` (String) - Pautan fail PDF versi ini
- \`uploadedAt\` (Timestamp)
- \`comments\` (String, Pilihan) - Nota pembetulan dari pelajar

### Koleksi: \`reviews\`
Menyimpan sejarah semakan dan komen dari pelbagai pihak (Penyemak, Urus Setia, YDP, TNC).
- \`id\` (String)
- \`applicationId\` (String) - Rujukan ke \`applications.id\`
- \`reviewerId\` (String) - Rujukan ke \`users.uid\`
- \`comments\` (String) - Ulasan atau sebab penolakan/pembetulan
- \`status\` (String) - Keputusan semakan (\`APPROVED\`, \`REJECTED\`, \`REVISION_REQUIRED\`)
- \`createdAt\` (Timestamp)

### Koleksi: \`reports\`
Menyimpan laporan pasca-program.
- \`id\` (String)
- \`applicationId\` (String) - Rujukan ke \`applications.id\`
- \`studentId\` (String) - Rujukan ke \`users.uid\`
- \`reportUrl\` (String) - Pautan fail laporan PDF
- \`receiptsUrl\` (Array of Strings) - Pautan gambar/PDF resit
- \`photosUrl\` (Array of Strings) - Pautan gambar aktiviti
- \`aiSentiment\` (String, Pilihan) - Analisis sentimen AI
- \`status\` (String) - \`PENDING\` | \`APPROVED\` | \`REJECTED\`
- \`createdAt\` (Timestamp)

### Koleksi: \`evidence\` (Modul Bakat)
Rekod evidence kompetensi yang TIDAK BOLEH DIUBAH — sumber tunggal kebenaran
untuk skor bakat. Skor TIDAK disimpan di mana-mana; ia dikira semula oleh
enjin (\`src/bakat/domain/scoring.ts\`) setiap kali dipaparkan.

- \`id\` (String) - Deterministik: \`{applicationId}__{sourceType}__{competencyCode}\`
- \`student_id\` (String) - Rujukan ke \`users.uid\`
- \`source_type\` (String) - \`participation\` | \`committee_role\` | \`competition_result\` | \`certificate\` | \`achievement\` | \`manual_endorsement\`
- \`source_id\` (String) - Rujukan polimorfik (bagi evidence terbitan: \`applications.id\`)
- \`competency_id\` (String) - Kod kompetensi 16 teras (LEA, COM, INN, TEC, ENT, SPO, ART, RES, VOL, CRT, DIG, GLO, PRJ, FIN, NEG, NET)
- \`points\` (Number) - 0–10 mata mentah sebelum pendarab/decay/cap
- \`weight_factors\` (Map) - \`role\` (RoleType), \`level\` (ProgrammeLevel), \`attendance_pct\` (0–100)
- \`ai_confidence\` (Number | null) - Keyakinan pemetaan AI; null jika bukan AI
- \`status\` (String) - \`pending\` | \`approved\` | \`disputed\` | \`void\` (hanya \`approved\` menyumbang kepada skor)
- \`approved_by\` (String | null) - \`e-kesatuan:unit_pelaporan\` bagi evidence terbitan automatik
- \`approved_at\` (Timestamp | null)
- \`superseded_by\` (String | null) - ID rekod ganti apabila void
- \`narrative\` (String) - Satu baris naratif untuk drill-down
- \`event_date\` (Timestamp) - Bila fakta berlaku (asas recency decay)
