// MOCK SUPABASE DALAM-MEMORI — untuk verifikasi visual/tangkapan skrin sahaja.
// CARA GUNA (jangan commit perubahan ini):
//   1. cp dev/mocksb.example.ts src/mocksb.ts
//   2. Tambah alias SEMENTARA dalam vite.config.ts resolve.alias:
//        '@supabase/supabase-js': path.resolve(__dirname, 'src/mocksb.ts'),
//   3. npm run dev → app log masuk automatik sebagai admin dengan data contoh.
//   4. Selepas selesai: buang alias & padam src/mocksb.ts.

import { Application, Report, User as AppUser } from './types';
import { deriveEvidence } from './bakat/derive';

type Doc = Record<string, unknown>;
const store = new Map<string, Map<string, Doc>>();
function col(name: string): Map<string, Doc> {
  if (!store.has(name)) store.set(name, new Map());
  return store.get(name)!;
}

const USERS: AppUser[] = [
  { uid: 'UID1', email: 'ekmupm@portal-bhep.upm.edu.my', role: 'student', name: 'Sarah binti Ahmad', matricNumber: 'A210001', faculty: 'Fakulti Kejuruteraan', college: 'Kolej Canselor', studyYear: '3', programme: 'Ijazah Sarjana Muda Kejuruteraan Mekanikal', phoneNumber: '+60 11-1234 5678', address: 'No. 12, Jalan Serdang Perdana 3, 43400 Seri Kembangan, Selangor', createdAt: '2025-01-01T00:00:00.000Z' },
  { uid: 'UID2', email: 'weijie@siswa.upm.edu.my', role: 'student', name: 'Wei Jie Tan', matricNumber: 'A220114', faculty: 'Fakulti Sains Komputer dan Teknologi Maklumat', studyYear: '2', programme: 'Ijazah Sarjana Muda Sains Komputer', createdAt: '2025-01-01T00:00:00.000Z' },
  { uid: 'UID4', email: 'rajesh@siswa.upm.edu.my', role: 'student', name: 'Rajesh a/l Kumar', matricNumber: 'A230210', faculty: 'Fakulti Ekonomi dan Pengurusan', createdAt: '2025-01-01T00:00:00.000Z' },
  { uid: 'UID5', email: 'aisyah@siswa.upm.edu.my', role: 'student', name: 'Nur Aisyah binti Karim', matricNumber: 'A250088', faculty: 'Fakulti Perubatan dan Sains Kesihatan', createdAt: '2025-01-01T00:00:00.000Z' },
];

function mkApp(a: Partial<Application> & { id: string; applicantId: string; title: string; status: Application['status'] }): Application {
  return {
    applicantPosition: 'Pengarah', startDate: '2026-03-01', endDate: '2026-03-03', budget: 5000,
    category: 'Kepimpinan', organizingLevel: 'Universiti', softSkills: [], objective: 'Demo.',
    academicSession: '2025/2026', semester: '2', venue: 'Dewan Besar UPM', speaker: '', paperUrl: '',
    createdAt: '2026-01-10T00:00:00.000Z', updatedAt: '2026-05-01T00:00:00.000Z', ...a,
  } as Application;
}

const APPS: Application[] = [
  mkApp({ id: 'KM.25-26.003', applicantId: 'UID1', title: 'Festival Zapin MAKUM 2026', category: 'Kebudayaan', organizingLevel: 'Kebangsaan', budget: 8000, approvedAmount: 7000, startDate: '2026-04-01', endDate: '2026-04-03', status: 'Lulus Sepenuhnya', softSkills: ['Kemahiran Kepimpinan', 'Kemahiran Berkomunikasi'] }),
  mkApp({ id: 'KM.25-26.011', applicantId: 'UID1', applicantPosition: 'Setiausaha', title: 'Program Bantuan Banjir Kelantan', category: 'Kesukarelawanan', budget: 3000, approvedAmount: 3000, startDate: '2026-01-12', endDate: '2026-01-15', status: 'Lulus Sepenuhnya' }),
  mkApp({ id: 'KM.24-25.045', applicantId: 'UID1', title: 'Sidang Kemuncak Pemimpin Muda ASEAN', organizingLevel: 'Antarabangsa', budget: 15000, approvedAmount: 12000, academicSession: '2024/2025', semester: '1', startDate: '2025-09-18', endDate: '2025-09-20', status: 'Lulus Sepenuhnya', softSkills: ['Kemahiran Kepimpinan'] }),
  mkApp({ id: 'KM.25-26.019', applicantId: 'UID2', title: 'Hackathon Inovasi Digital UPM', category: 'Akademik & Intelektual', budget: 4000, approvedAmount: 3800, startDate: '2026-03-08', endDate: '2026-03-10', status: 'Lulus Sepenuhnya' }),
  mkApp({ id: 'KM.25-26.024', applicantId: 'UID4', applicantPosition: 'Setiausaha', title: 'Karnival Sukan Antara Kolej', category: 'Sukan', budget: 6000, approvedAmount: 5800, startDate: '2026-05-16', endDate: '2026-05-18', status: 'Lulus Sepenuhnya' }),
  mkApp({ id: 'KM.25-26.030', applicantId: 'UID2', title: 'Ekspo Keusahawanan Siswa', category: 'Keusahawanan', organizingLevel: 'Kebangsaan', budget: 9000, approvedAmount: 8500, startDate: '2026-06-01', endDate: '2026-06-02', status: 'Lulus Sepenuhnya' }),
  mkApp({ id: 'KM.25-26.031', applicantId: 'UID5', title: 'Minggu Kerohanian Kampus', category: 'Kerohanian', organizingLevel: 'Kolej atau Fakulti', budget: 2500, approvedAmount: 2500, academicSession: '2025/2026', semester: '1', startDate: '2025-10-05', endDate: '2025-10-09', status: 'Lulus Sepenuhnya' }),
  mkApp({ id: 'KM.25-26.033', applicantId: 'UID4', title: 'Bengkel Kelestarian Alam Sekitar', category: 'Kelestarian & Alam Sekitar', organizingLevel: 'Negeri', budget: 3500, startDate: '2026-09-05', endDate: '2026-09-06', status: 'Menunggu Kelulusan YDP' }),
  mkApp({ id: 'KM.25-26.034', applicantId: 'UID2', title: 'Festival Filem Pelajar', category: 'Kebudayaan', budget: 5000, startDate: '2026-10-01', endDate: '2026-10-03', status: 'Ditolak' }),
  mkApp({ id: 'KM.25-26.035', applicantId: 'UID1', title: 'Larian Amal UPM 2026', category: 'Sukan', budget: 7000, startDate: '2026-11-15', endDate: '2026-11-15', status: 'Menunggu Pembentangan' }),
];

function mkReport(r: Partial<Report> & { id: string; applicationId: string; applicantId: string; status: Report['status'] }): Report {
  return { reportUrl: '', receiptUrl: '', unionBudgetUsed: 0, participantCount: 0, submittedAt: '2026-05-05T00:00:00.000Z', ...r } as Report;
}

const REPORTS: Report[] = [
  mkReport({ id: 'R1', applicationId: 'KM.25-26.003', applicantId: 'UID1', status: 'Disahkan', verifiedBudgetUsed: 6800, participantCount: 320, reviewedAt: '2026-04-20T00:00:00.000Z' }),
  mkReport({ id: 'R2', applicationId: 'KM.25-26.011', applicantId: 'UID1', status: 'Disahkan', verifiedBudgetUsed: 2900, participantCount: 85, reviewedAt: '2026-02-01T00:00:00.000Z' }),
  mkReport({ id: 'R3', applicationId: 'KM.24-25.045', applicantId: 'UID1', status: 'Disahkan', verifiedBudgetUsed: 11500, participantCount: 210, reviewedAt: '2025-10-05T00:00:00.000Z' }),
  mkReport({ id: 'R4', applicationId: 'KM.25-26.019', applicantId: 'UID2', status: 'Disahkan', verifiedBudgetUsed: 3800, participantCount: 150, reviewedAt: '2026-03-25T00:00:00.000Z' }),
  mkReport({ id: 'R5', applicationId: 'KM.25-26.024', applicantId: 'UID4', status: 'Disahkan', verifiedBudgetUsed: 5600, participantCount: 400, reviewedAt: '2026-06-01T00:00:00.000Z' }),
  mkReport({ id: 'R6', applicationId: 'KM.25-26.030', applicantId: 'UID2', status: 'Dihantar', unionBudgetUsed: 8700, participantCount: 500 }),
  mkReport({ id: 'R7', applicationId: 'KM.25-26.031', applicantId: 'UID5', status: 'Disahkan', verifiedBudgetUsed: 2400, participantCount: 120, reviewedAt: '2025-11-01T00:00:00.000Z' }),
];

for (const u of USERS) col('users').set(u.uid, { ...u });
for (const a of APPS) col('applications').set(a.id, { ...a });
for (const r of REPORTS) col('reports').set(r.id, { ...r });
col('settings').set('categories', { list: ['Kesukarelawanan', 'Kepimpinan', 'Kebudayaan', 'Sukan', 'Keusahawanan', 'Akademik & Intelektual', 'Kerohanian', 'Kelestarian & Alam Sekitar'] });
const reportByApp = new Map(REPORTS.map((r) => [r.applicationId, r]));
for (const a of APPS) for (const e of deriveEvidence(a, reportByApp.get(a.id))) col('evidence').set(e.id, { ...e });

const MOCK_USER = {
  id: 'UID1',
  email: 'ekmupm@portal-bhep.upm.edu.my',
  user_metadata: { full_name: 'Urus Setia BHEP UPM' },
};

interface Filter { field: string; value: unknown }
class Query {
  private filters: Filter[] = [];
  private orderField: { f: string; asc: boolean } | null = null;
  constructor(private colName: string) {}
  select(_cols?: string) { return this; }
  eq(field: string, value: unknown) { this.filters.push({ field, value }); return this; }
  neq(_f: string, _v: unknown) { return this; }
  like(_f: string, _v: string) { return this; }
  order(f: string, opts?: { ascending?: boolean }) { this.orderField = { f, asc: opts?.ascending !== false }; return this; }
  private rows(): Doc[] {
    let rows = Array.from(col(this.colName).entries()).map(([id, d]) => ({ ...d, id: (d as { id?: string }).id ?? id }));
    for (const flt of this.filters) rows = rows.filter((r) => (r as Doc)[flt.field] === flt.value);
    if (this.orderField) {
      const { f, asc } = this.orderField;
      rows.sort((a, b) => String((a as Doc)[f] ?? '').localeCompare(String((b as Doc)[f] ?? '')) * (asc ? 1 : -1));
    }
    return rows as Doc[];
  }
  maybeSingle() { const r = this.rows(); return Promise.resolve({ data: r[0] ?? null, error: null }); }
  single() { const r = this.rows(); return Promise.resolve({ data: r[0] ?? null, error: r[0] ? null : { message: 'tiada baris' } }); }
  insert(data: Doc | Doc[]) {
    const arr = Array.isArray(data) ? data : [data];
    for (const d of arr) {
      const id = (d.id as string) ?? (d.uid as string) ?? `auto_${col(this.colName).size + 1}`;
      col(this.colName).set(id, { ...d, id });
    }
    return this;
  }
  upsert(data: Doc | Doc[], _opts?: object) { return this.insert(data); }
  update(data: Doc) {
    const self = this;
    return {
      eq(field: string, value: unknown) {
        for (const [id, d] of col(self.colName)) {
          if ((d[field] ?? id) === value) col(self.colName).set(id, { ...d, ...data });
        }
        return Promise.resolve({ data: null, error: null });
      },
    };
  }
  delete() { return this; }
  then(resolve: (v: { data: Doc[]; error: null }) => void) { resolve({ data: this.rows(), error: null }); }
}

export function createClient() {
  return {
    from: (name: string) => new Query(name),
    auth: {
      getSession: async () => ({ data: { session: { user: MOCK_USER } } }),
      getUser: async () => ({ data: { user: MOCK_USER } }),
      onAuthStateChange: (cb: (e: string, s: { user: typeof MOCK_USER } | null) => void) => {
        setTimeout(() => cb('SIGNED_IN', { user: MOCK_USER }), 0);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
      signInWithPassword: async () => ({ error: null }),
      signUp: async () => ({ data: { session: { user: MOCK_USER } }, error: null }),
      signOut: async () => ({}),
    },
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/mock.pdf' } }),
      }),
    },
  };
}

// Jenis 'User' yang diimport oleh src/supabase.ts
export type User = { id: string; email?: string; user_metadata?: Record<string, string> };
