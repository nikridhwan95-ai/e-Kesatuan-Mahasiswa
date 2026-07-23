// Perancang import program — fungsi TULEN (tiada I/O, tiada Supabase).
// Diasingkan daripada importService supaya keputusan penduaan, padanan
// pelajar dan peruntukan ID boleh diuji oleh check:bakat.

import { ImportedProgramme, dedupeKey, importedStudentUid } from './importParser';

export interface ProgrammePlanRow {
  programme: ImportedProgramme;
  action: 'cipta' | 'langkau';
  reason?: string; // untuk 'langkau'
  uid?: string; // pelajar (sedia ada atau sintetik baharu)
  createUser?: boolean; // benar jika rekod pelajar baharu perlu dicipta
  appId?: string; // ID permohonan yang diperuntukkan (KM.<sesi>.<seq>)
  key?: string; // kunci penduaan baris ini
}

// Awalan sesi ID permohonan mengikut tarikh mula program (Sept = sesi baharu).
export function sessionPrefix(startDate: string): string {
  const d = new Date(startDate);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  const startYear = month >= 8 ? year : year - 1;
  return `KM.${startYear.toString().slice(-2)}-${(startYear + 1).toString().slice(-2)}.`;
}

// Terbitkan matrik daripada uid sintetik 'M-<matrik>' — permohonan sedia ada
// yang pemohonnya tiada dalam senarai pengguna (atau senarai tidak lengkap)
// tetap dikunci dengan matrik yang sama seperti baris Excel yang masuk.
// Tanpa ini, kunci jatuh balik kepada uid mentah dan penduaan terlepas.
export function matricFromUid(uid: string, matricByUid: Map<string, string>): string {
  const known = matricByUid.get(uid);
  if (known) return known;
  if (uid.startsWith('M-')) return uid.slice(2).toUpperCase();
  return uid;
}

export function planProgrammeImport(
  programmes: ImportedProgramme[],
  existingUsers: { uid: string; matricNumber?: string | null }[],
  existingApps: {
    id: string;
    applicantId: string;
    title?: string | null;
    startDate?: string | null;
  }[],
): ProgrammePlanRow[] {
  const uidByMatric = new Map<string, string>();
  const matricByUid = new Map<string, string>();
  for (const u of existingUsers) {
    if (u.matricNumber) {
      uidByMatric.set(u.matricNumber.toUpperCase(), u.uid);
      matricByUid.set(u.uid, u.matricNumber.toUpperCase());
    }
  }

  const existingKeys = new Set<string>();
  const seqByPrefix = new Map<string, number>();
  for (const a of existingApps) {
    const matric = matricFromUid(a.applicantId, matricByUid);
    existingKeys.add(dedupeKey(matric, a.title ?? '', a.startDate ?? ''));
    const m = String(a.id).match(/^(KM\.\d{2}-\d{2}\.)(\d+)$/);
    if (m) {
      const seq = parseInt(m[2], 10);
      if (seq > (seqByPrefix.get(m[1]) ?? 0)) seqByPrefix.set(m[1], seq);
    }
  }

  const plannedNewUsers = new Set<string>(); // matrik yang bakal dicipta dalam kelompok ini

  return programmes.map((p) => {
    const key = dedupeKey(p.student.matric, p.title, p.startDate);
    if (existingKeys.has(key)) {
      return {
        programme: p,
        action: 'langkau' as const,
        reason: 'Program sudah wujud dalam sistem',
        key,
      };
    }
    existingKeys.add(key); // baris kembar dalam fail yang sama turut dilangkau

    const matric = p.student.matric.toUpperCase();
    let uid = uidByMatric.get(matric);
    let createUser = false;
    if (!uid) {
      uid = importedStudentUid(p.student.matric);
      createUser = !plannedNewUsers.has(matric);
      plannedNewUsers.add(matric);
      uidByMatric.set(matric, uid);
    }

    const prefix = sessionPrefix(p.startDate);
    const nextSeq = (seqByPrefix.get(prefix) ?? 0) + 1;
    seqByPrefix.set(prefix, nextSeq);
    const appId = `${prefix}${String(nextSeq).padStart(3, '0')}`;

    return { programme: p, action: 'cipta' as const, uid, createUser, appId, key };
  });
}
