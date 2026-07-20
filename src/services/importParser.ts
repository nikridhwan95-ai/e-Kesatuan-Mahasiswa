// Parser TULEN untuk import Excel program pukal (tiada I/O — mudah diuji).
// Satu baris Excel = satu program yang TELAH selesai (lulus sepenuhnya dan
// laporannya disahkan). Import akan mencipta rekod pelajar, permohonan,
// laporan, dan bukti bakat secara automatik.

export interface ImportedProgramme {
  student: {
    name: string;
    matric: string;
    email?: string;
    faculty?: string;
    college?: string;
  };
  jawatan: 'Pengarah' | 'Setiausaha';
  title: string;
  kategori: string;
  peringkat: 'Antarabangsa' | 'Kebangsaan' | 'Negeri' | 'Universiti' | 'Kolej atau Fakulti';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  budgetApproved: number;
  budgetVerified: number;
  participants: number;
  softSkills: string[];
  objektif: string;
}

export interface RowIssue {
  row: number; // nombor baris Excel (bermula 2; baris 1 = kepala)
  severity: 'ralat' | 'amaran';
  message: string;
}

export const TEMPLATE_HEADERS = [
  'Nama Pelajar',
  'No. Matrik',
  'E-mel',
  'Fakulti',
  'Kolej',
  'Jawatan',
  'Tajuk Program',
  'Kategori',
  'Peringkat',
  'Tarikh Mula',
  'Tarikh Tamat',
  'Bajet Diluluskan (RM)',
  'Bajet Disahkan (RM)',
  'Bilangan Peserta',
  'Kemahiran Insaniah',
  'Objektif',
] as const;

export const TEMPLATE_EXAMPLE_ROW = [
  'Sarah binti Ahmad',
  'A210001',
  'sarah@siswa.upm.edu.my',
  'Fakulti Kejuruteraan',
  'Kolej Canselor',
  'Pengarah',
  'Festival Zapin MAKUM 2026',
  'Kebudayaan',
  'Kebangsaan',
  '01/04/2026',
  '03/04/2026',
  8000,
  6800,
  320,
  'Kemahiran Kepimpinan; Kemahiran Berkomunikasi',
  'Memperkasa warisan seni budaya dan jaringan antara universiti.',
];

export const VALID_JAWATAN = ['Pengarah', 'Setiausaha'];
export const VALID_PERINGKAT = ['Antarabangsa', 'Kebangsaan', 'Negeri', 'Universiti', 'Kolej atau Fakulti'];
export const VALID_KATEGORI = [
  'Kesukarelawanan', 'Kepimpinan', 'Kebudayaan', 'Sukan', 'Keusahawanan',
  'Akademik & Intelektual', 'Kerohanian', 'Kelestarian & Alam Sekitar',
];
export const VALID_SOFTSKILLS = [
  'Kemahiran Berkomunikasi',
  'Pemikiran Kritis dan Kemahiran Penyelesaian Masalah',
  'Kemahiran Kerja Berpasukan',
  'Pembelajaran Berterusan dan Pengurusan Maklumat',
  'Kemahiran Keusahawanan',
  'Etika dan Moral Profesional',
  'Kemahiran Kepimpinan',
];

// Padanan kepala lajur secara longgar: huruf kecil, buang aksara bukan alfanumerik.
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HEADER_KEY: Record<string, keyof RawRow> = {
  namapelajar: 'name',
  nama: 'name',
  nomatrik: 'matric',
  matrik: 'matric',
  nombormatrik: 'matric',
  emel: 'email',
  email: 'email',
  fakulti: 'faculty',
  kolej: 'college',
  jawatan: 'jawatan',
  tajukprogram: 'title',
  tajuk: 'title',
  namaprogram: 'title',
  kategori: 'kategori',
  peringkat: 'peringkat',
  peringkatpenganjuran: 'peringkat',
  tarikhmula: 'startDate',
  tarikhtamat: 'endDate',
  bajetdiluluskanrm: 'budgetApproved',
  bajetdiluluskan: 'budgetApproved',
  bajetdisahkanrm: 'budgetVerified',
  bajetdisahkan: 'budgetVerified',
  bilanganpeserta: 'participants',
  peserta: 'participants',
  kemahiraninsaniah: 'softSkills',
  objektif: 'objektif',
};

interface RawRow {
  name?: unknown;
  matric?: unknown;
  email?: unknown;
  faculty?: unknown;
  college?: unknown;
  jawatan?: unknown;
  title?: unknown;
  kategori?: unknown;
  peringkat?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  budgetApproved?: unknown;
  budgetVerified?: unknown;
  participants?: unknown;
  softSkills?: unknown;
  objektif?: unknown;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(String(v).replace(/[,\sRM]/gi, ''));
  return Number.isFinite(n) ? n : NaN;
}

// Normalisasi tarikh: objek Date, nombor siri Excel, 'dd/mm/yyyy', 'yyyy-mm-dd'.
export function normalizeDate(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    // Nombor siri Excel (epok 1899-12-30)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  const s = str(v);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

// Petakan baris mentah dari sheet (kunci = kepala lajur asal) kepada RawRow.
export function mapHeaders(sheetRow: Record<string, unknown>): RawRow {
  const out: RawRow = {};
  for (const [header, value] of Object.entries(sheetRow)) {
    const key = HEADER_KEY[normalizeHeader(header)];
    if (key && out[key] === undefined) out[key] = value;
  }
  return out;
}

export function parseRows(sheetRows: Record<string, unknown>[]): {
  programmes: ImportedProgramme[];
  issues: RowIssue[];
} {
  const programmes: ImportedProgramme[] = [];
  const issues: RowIssue[] = [];

  sheetRows.forEach((sheetRow, i) => {
    const rowNo = i + 2; // baris 1 = kepala lajur
    const r = mapHeaders(sheetRow);
    const rowErrors: string[] = [];

    const name = str(r.name);
    const matric = str(r.matric).toUpperCase();
    const jawatan = str(r.jawatan);
    const title = str(r.title);
    const kategori = str(r.kategori);
    const peringkat = str(r.peringkat);
    const startDate = normalizeDate(r.startDate);
    const endDate = normalizeDate(r.endDate) ?? startDate;

    if (!name) rowErrors.push('Nama Pelajar diperlukan');
    if (!matric) rowErrors.push('No. Matrik diperlukan');
    if (!title) rowErrors.push('Tajuk Program diperlukan');
    if (!VALID_JAWATAN.includes(jawatan))
      rowErrors.push(`Jawatan mesti '${VALID_JAWATAN.join("' atau '")}'`);
    if (!VALID_PERINGKAT.includes(peringkat))
      rowErrors.push(`Peringkat mesti salah satu: ${VALID_PERINGKAT.join(', ')}`);
    if (!startDate) rowErrors.push('Tarikh Mula tidak sah (guna format hh/bb/tttt)');

    const budgetApproved = num(r.budgetApproved);
    const budgetVerified = num(r.budgetVerified);
    const participants = num(r.participants);
    if (Number.isNaN(budgetApproved)) rowErrors.push('Bajet Diluluskan bukan nombor');
    if (Number.isNaN(budgetVerified)) rowErrors.push('Bajet Disahkan bukan nombor');
    if (Number.isNaN(participants)) rowErrors.push('Bilangan Peserta bukan nombor');

    if (rowErrors.length > 0) {
      for (const message of rowErrors) issues.push({ row: rowNo, severity: 'ralat', message });
      return;
    }

    if (!VALID_KATEGORI.includes(kategori)) {
      issues.push({
        row: rowNo,
        severity: 'amaran',
        message: `Kategori '${kategori}' bukan salah satu 8 Teras — bukti kompetensi kategori tidak akan dijana`,
      });
    }

    const rawSkills = str(r.softSkills)
      .split(/[;,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const softSkills = rawSkills.filter((s) => VALID_SOFTSKILLS.includes(s));
    for (const unknown of rawSkills.filter((s) => !VALID_SOFTSKILLS.includes(s))) {
      issues.push({
        row: rowNo,
        severity: 'amaran',
        message: `Kemahiran insaniah '${unknown}' tidak dikenali dan dilangkau`,
      });
    }

    programmes.push({
      student: {
        name,
        matric,
        email: str(r.email) || undefined,
        faculty: str(r.faculty) || undefined,
        college: str(r.college) || undefined,
      },
      jawatan: jawatan as ImportedProgramme['jawatan'],
      title,
      kategori,
      peringkat: peringkat as ImportedProgramme['peringkat'],
      startDate: startDate!,
      endDate: endDate!,
      budgetApproved,
      budgetVerified,
      participants,
      softSkills,
      objektif: str(r.objektif),
    });
  });

  return { programmes, issues };
}

// Kunci penduaan: program yang sama tidak diimport dua kali.
export function dedupeKey(matric: string, title: string, startDate: string): string {
  return `${matric.toUpperCase()}|${title.trim().toLowerCase()}|${startDate}`;
}

// UID sintetik untuk pelajar yang diimport (belum mempunyai akaun log masuk).
export function importedStudentUid(matric: string): string {
  return `M-${matric.toUpperCase()}`;
}
