# e-Kesatuan Mahasiswa (Portal Pengurusan Aktiviti Pelajar)

## 1. Struktur Folder Projek

\`\`\`
/src
  /components
    /auth               # Komponen log masuk & pendaftaran
    /dashboard          # Papan pemuka untuk pelbagai peranan
    /application        # Borang permohonan & muat naik kertas kerja
    /approval           # Aliran kelulusan (ApprovalWorkflow.tsx)
    /report             # Modul pelaporan pasca-program
    /ui                 # Komponen UI guna semula (Butang, Modal, Kad)
  /services
    /firebase           # Konfigurasi & fungsi Firestore/Storage
    /ai                 # Integrasi API Google Gemini (summarizer.ts)
  /types                # Definisi TypeScript (index.ts)
  /utils                # Fungsi utiliti (format tarikh, penjanaan PDF)
  /hooks                # Custom React Hooks (useAuth, useApplication)
  /context              # React Context (AuthContext)
\`\`\`

## 2. Skema Pangkalan Data (Firestore - NoSQL)

Sistem ini menggunakan struktur NoSQL berasaskan dokumen.

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
