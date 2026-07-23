// Lapisan data Supabase (Postgres + Storage) — SEMUA akses DB e-Kesatuan
// melalui fail ini. Kawalan akses dikuatkuasakan oleh RLS (supabase/schema.sql).

import { supabase } from '../supabase';
import { User, Application, Report, PresentationSession, UserRole } from '../types';

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'ralat tidak diketahui'}`);
}

// ── Profil Pengguna ─────────────────────────────────────────────────────────

export const getUserProfile = async (uid: string): Promise<User | null> => {
  const { data, error } = await supabase.from('users').select('*').eq('uid', uid).maybeSingle();
  if (error) fail('getUserProfile', error);
  return (data as User | null) ?? null;
};

export const createUserProfile = async (uid: string, data: Partial<User>) => {
  const { error } = await supabase
    .from('users')
    .upsert(
      { ...data, uid, createdAt: data.createdAt ?? new Date().toISOString() },
      { onConflict: 'uid' },
    );
  if (error) fail('createUserProfile', error);
};

export const updateUserProfile = async (uid: string, data: Partial<User>) => {
  const { error } = await supabase.from('users').update(data).eq('uid', uid);
  if (error) fail('updateUserProfile', error);
};

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('users').select('*');
  if (error) fail('getUsers', error);
  return (data ?? []) as User[];
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (error) fail('getUserByEmail', error);
  return (data as User | null) ?? null;
};

// ── Permohonan ──────────────────────────────────────────────────────────────

export const getApplications = async (role: UserRole, uid: string): Promise<Application[]> => {
  let query = supabase.from('applications').select('*');
  if (role === 'student') {
    query = query.eq('applicantId', uid);
  } else {
    query = query.order('createdAt', { ascending: false });
  }
  const { data, error } = await query;
  if (error) fail('getApplications', error);
  return (data ?? []) as Application[];
};

export const getApplicationById = async (appId: string): Promise<Application | null> => {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('id', appId)
    .maybeSingle();
  if (error) fail('getApplicationById', error);
  return (data as Application | null) ?? null;
};

export const createApplication = async (
  application: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>,
) => {
  // ID berformat KM.<sesi>.<turutan>, cth KM.25-26.001 (sama seperti dahulu).
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month >= 8 ? year : year - 1;
  const sessionStr = `${startYear.toString().slice(-2)}-${(startYear + 1).toString().slice(-2)}`;
  const prefix = `KM.${sessionStr}.`;

  const { data: existing, error: qErr } = await supabase
    .from('applications')
    .select('id')
    .like('id', `${prefix}%`);
  if (qErr) fail('createApplication', qErr);

  let maxSeq = 0;
  for (const row of existing ?? []) {
    const seq = parseInt(String(row.id).substring(prefix.length), 10);
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
  }
  const newId = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;

  const { error } = await supabase.from('applications').insert({
    ...application,
    id: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  if (error) fail('createApplication', error);
  return newId;
};

export const updateApplicationStatus = async (
  appId: string,
  status: string,
  comment?: string,
  approvedAmount?: number,
) => {
  const data: Record<string, unknown> = { status, updatedAt: new Date().toISOString() };
  if (comment) data.reviewerComment = comment;
  if (approvedAmount !== undefined) data.approvedAmount = approvedAmount;
  const { error } = await supabase.from('applications').update(data).eq('id', appId);
  if (error) fail('updateApplicationStatus', error);
};

export const updateApplication = async (appId: string, data: Partial<Application>) => {
  const { error } = await supabase
    .from('applications')
    .update({ ...data, updatedAt: new Date().toISOString() })
    .eq('id', appId);
  if (error) fail('updateApplication', error);
};

export const updateApplicationPresentation = async (
  appId: string,
  sessionId: string,
  date: string,
  room?: number,
) => {
  const { error } = await supabase
    .from('applications')
    .update({
      presentationSessionId: sessionId,
      presentationDate: date,
      presentationRoom: room,
      status: 'Menunggu Pembentangan',
      updatedAt: new Date().toISOString(),
    })
    .eq('id', appId);
  if (error) fail('updateApplicationPresentation', error);
};

export const deleteApplication = async (appId: string) => {
  const { error } = await supabase.from('applications').delete().eq('id', appId);
  if (error) fail('deleteApplication', error);
};

export const deleteAllApplications = async () => {
  const { error: e1 } = await supabase.from('applications').delete().neq('id', '');
  if (e1) fail('deleteAllApplications(applications)', e1);
  const { error: e2 } = await supabase.from('reports').delete().neq('id', '');
  if (e2) fail('deleteAllApplications(reports)', e2);
};

// ── Sesi Semakan / Pembentangan ─────────────────────────────────────────────

export const getPresentationSessions = async (): Promise<PresentationSession[]> => {
  const { data, error } = await supabase
    .from('presentation_sessions')
    .select('*')
    .order('date', { ascending: true });
  if (error) fail('getPresentationSessions', error);
  return (data ?? []) as PresentationSession[];
};

export const createPresentationSession = async (session: Omit<PresentationSession, 'id'>) => {
  const { data, error } = await supabase
    .from('presentation_sessions')
    .insert(session)
    .select('id')
    .single();
  if (error) fail('createPresentationSession', error);
  return data.id as string;
};

export const updatePresentationSessionStatus = async (
  sessionId: string,
  status: 'Open' | 'Closed',
) => {
  const { error } = await supabase
    .from('presentation_sessions')
    .update({ status })
    .eq('id', sessionId);
  if (error) fail('updatePresentationSessionStatus', error);
};

export const deletePresentationSession = async (sessionId: string) => {
  const { error } = await supabase.from('presentation_sessions').delete().eq('id', sessionId);
  if (error) fail('deletePresentationSession', error);
};

// ── Laporan ─────────────────────────────────────────────────────────────────

export const getReports = async (role: UserRole, uid: string): Promise<Report[]> => {
  let query = supabase.from('reports').select('*');
  if (role === 'student') query = query.eq('applicantId', uid);
  const { data, error } = await query;
  if (error) fail('getReports', error);
  return (data ?? []) as Report[];
};

export const createReport = async (report: Omit<Report, 'id' | 'submittedAt'>) => {
  const { data, error } = await supabase
    .from('reports')
    .insert({ ...report, submittedAt: new Date().toISOString() })
    .select('id')
    .single();
  if (error) fail('createReport', error);
  return data.id as string;
};

export const updateReportStatus = async (
  reportId: string,
  status: string,
  comment?: string,
  additionalData?: Partial<Report>,
) => {
  const updateData: Record<string, unknown> = {
    status,
    reviewedAt: new Date().toISOString(),
    ...additionalData,
  };
  if (comment) updateData.reviewerComment = comment;
  const { error } = await supabase.from('reports').update(updateData).eq('id', reportId);
  if (error) fail('updateReportStatus', error);
};

// ── Muat Naik Fail (Supabase Storage, baldi 'uploads' — PERIBADI) ──────────
// Baldi adalah peribadi: nilai yang disimpan dalam DB ialah LALUAN storan,
// dan capaian dibuat melalui URL bertandatangan (getFileUrl). Rekod lama
// mungkin masih menyimpan URL awam penuh — getFileUrl menyokong kedua-duanya.

export const uploadFile = async (path: string, file: File): Promise<string> => {
  const { error } = await supabase.storage.from('uploads').upload(path, file);
  if (error) {
    console.error('Error uploading file:', error);
    throw new Error(
      'Ralat Storage: Sila pastikan baldi "uploads" wujud di Supabase (jalankan supabase/schema.sql).',
    );
  }
  return path;
};

// Tempoh sah URL bertandatangan (saat).
const SIGNED_URL_TTL = 3600;

// Terima laluan storan ATAU URL awam lama; pulangkan URL bertandatangan
// yang boleh dibuka dalam pelayar.
export const getFileUrl = async (stored: string): Promise<string> => {
  if (!stored) throw new Error('getFileUrl: tiada laluan fail');
  let path = stored;
  if (/^https?:\/\//.test(stored)) {
    const marker = '/object/public/uploads/';
    const idx = stored.indexOf(marker);
    if (idx === -1) return stored; // URL luaran — pulangkan seadanya
    path = decodeURIComponent(stored.slice(idx + marker.length).split('?')[0]);
  }
  const { data, error } = await supabase.storage
    .from('uploads')
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) fail('getFileUrl', error ?? { message: 'URL tidak dijana' });
  return data.signedUrl;
};

// ── Tetapan (jadual settings: id → data jsonb) ─────────────────────────────

export const getSetting = async <T = Record<string, unknown>>(id: string): Promise<T | null> => {
  const { data, error } = await supabase.from('settings').select('data').eq('id', id).maybeSingle();
  if (error) fail('getSetting', error);
  return (data?.data as T | undefined) ?? null;
};

export const saveSetting = async (id: string, data: Record<string, unknown>) => {
  const { error } = await supabase.from('settings').upsert({ id, data }, { onConflict: 'id' });
  if (error) fail('saveSetting', error);
};

async function getSettingList(id: string, defaults: string[]): Promise<string[]> {
  const data = await getSetting<{ list?: string[] }>(id);
  return data?.list ?? defaults;
}

async function addToSettingList(id: string, value: string, defaults: string[]) {
  const list = await getSettingList(id, defaults);
  if (!list.includes(value)) {
    await saveSetting(id, { list: [...list, value] });
  }
}

async function removeFromSettingList(id: string, value: string, defaults: string[]) {
  const list = await getSettingList(id, defaults);
  await saveSetting(id, { list: list.filter((v) => v !== value) });
}

const DEFAULT_CATEGORIES = [
  'Kesukarelawanan',
  'Kepimpinan',
  'Kebudayaan',
  'Sukan',
  'Keusahawanan',
  'Akademik & Intelektual',
  'Kerohanian',
  'Kelestarian & Alam Sekitar',
];

const DEFAULT_FACULTIES = [
  'Fakulti Pertanian',
  'Fakulti Perhutanan dan Alam Sekitar',
  'Fakulti Veterinar',
  'Fakulti Ekonomi dan Pengurusan',
  'Fakulti Kejuruteraan',
  'Fakulti Pengajian Pendidikan',
  'Fakulti Sains',
  'Fakulti Sains dan Teknologi Makanan',
  'Fakulti Reka Bentuk dan Seni Bina',
  'Fakulti Bahasa Moden dan Komunikasi',
  'Fakulti Perubatan dan Sains Kesihatan',
  'Fakulti Sains Komputer dan Teknologi Maklumat',
  'Fakulti Bioteknologi dan Sains Biomolekul',
  'Fakulti Kemanusiaan, Pengurusan dan Sains',
  'Sekolah Perniagaan dan Ekonomi',
];

const DEFAULT_COLLEGES = [
  'Kolej Mohamad Rashid',
  'Kolej Kedua',
  'Kolej Tun Dr. Ismail',
  'Kolej Canselor',
  'Kolej Kelima',
  'Kolej Keenam',
  'Kolej Sultan Alauddin Suleiman Shah',
  'Kolej Kelapan',
  'Kolej Kesepuluh',
  'Kolej Sebelas',
  'Kolej Dua Belas',
  'Kolej Tiga Belas',
  'Kolej Empat Belas',
  'Kolej Lima Belas',
  'Kolej Enam Belas',
  'Kolej Tujuh Belas',
  'Kolej Sri Rajang',
];

export const getCategories = () => getSettingList('categories', DEFAULT_CATEGORIES);
export const addCategory = (c: string) => addToSettingList('categories', c, DEFAULT_CATEGORIES);
export const deleteCategory = (c: string) =>
  removeFromSettingList('categories', c, DEFAULT_CATEGORIES);

export const getFaculties = () => getSettingList('faculties', DEFAULT_FACULTIES);
export const addFaculty = (f: string) => addToSettingList('faculties', f, DEFAULT_FACULTIES);
export const deleteFaculty = (f: string) =>
  removeFromSettingList('faculties', f, DEFAULT_FACULTIES);

export const getColleges = () => getSettingList('colleges', DEFAULT_COLLEGES);
export const addCollege = (c: string) => addToSettingList('colleges', c, DEFAULT_COLLEGES);
export const deleteCollege = (c: string) => removeFromSettingList('colleges', c, DEFAULT_COLLEGES);
