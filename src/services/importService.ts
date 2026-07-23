// Import Excel program pukal — lapisan I/O Supabase.
// Setiap program yang sah akan mencipta (jika belum wujud):
//   1. rekod pelajar (users, uid sintetik M-<matrik>)
//   2. permohonan berstatus 'Lulus Sepenuhnya'
//   3. laporan berstatus 'Disahkan'
//   4. bukti bakat (melalui enjin derivation sebenar — idempotent)

import { supabase } from '../supabase';
import { Application, Report, User } from '../types';
import { getCurrentAcademicSession, getCurrentSemester } from '../utils/dateUtils';
import { syncEvidenceForApplication } from '../bakat/evidenceService';
import { ImportedProgramme, ImportedStudent, dedupeKey, importedStudentUid } from './importParser';

export interface StudentImportResultRow {
  student: ImportedStudent;
  status: 'dicipta' | 'dikemas kini' | 'ralat';
  detail: string;
}

// Import butiran pelajar: padankan melalui no. matrik — pelajar sedia ada
// DIKEMAS KINI (hanya medan yang diisi dalam Excel), pelajar baharu dicipta.
export async function importStudents(
  students: ImportedStudent[],
  onProgress?: (done: number, total: number) => void,
): Promise<StudentImportResultRow[]> {
  const { data: existing, error } = await supabase.from('users').select('uid, matricNumber');
  if (error) throw new Error(`Gagal memuat senarai pengguna: ${error.message}`);

  const uidByMatric = new Map<string, string>();
  for (const u of (existing ?? []) as Pick<User, 'uid' | 'matricNumber'>[]) {
    if (u.matricNumber) uidByMatric.set(u.matricNumber.toUpperCase(), u.uid);
  }

  const results: StudentImportResultRow[] = [];
  let done = 0;

  for (const s of students) {
    try {
      const fields: Record<string, unknown> = {
        name: s.name,
        matricNumber: s.matric,
        ...(s.email ? { email: s.email } : {}),
        ...(s.faculty ? { faculty: s.faculty } : {}),
        ...(s.college ? { college: s.college } : {}),
        ...(s.studyYear ? { studyYear: s.studyYear } : {}),
        ...(s.programme ? { programme: s.programme } : {}),
        ...(s.phone ? { phoneNumber: s.phone } : {}),
        ...(s.address ? { address: s.address } : {}),
      };

      const existingUid = uidByMatric.get(s.matric);
      if (existingUid) {
        const { error: updErr } = await supabase
          .from('users')
          .update(fields)
          .eq('uid', existingUid);
        if (updErr) throw new Error(updErr.message);
        results.push({ student: s, status: 'dikemas kini', detail: existingUid });
      } else {
        const uid = importedStudentUid(s.matric);
        const { error: insErr } = await supabase.from('users').upsert(
          {
            uid,
            role: 'student',
            email: s.email ?? `${s.matric.toLowerCase()}@import.portal-bhep.upm.edu.my`,
            createdAt: new Date().toISOString(),
            ...fields,
          },
          { onConflict: 'uid' },
        );
        if (insErr) throw new Error(insErr.message);
        uidByMatric.set(s.matric, uid);
        results.push({ student: s, status: 'dicipta', detail: uid });
      }
    } catch (err) {
      results.push({
        student: s,
        status: 'ralat',
        detail: err instanceof Error ? err.message : 'Ralat tidak diketahui',
      });
    } finally {
      done += 1;
      onProgress?.(done, students.length);
    }
  }

  return results;
}

export interface ImportResultRow {
  programme: ImportedProgramme;
  status: 'dicipta' | 'dilangkau' | 'ralat';
  detail: string; // ID permohonan / sebab langkau / mesej ralat
  buktiCreated: number;
}

function sessionPrefix(startDate: string): string {
  const d = new Date(startDate);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  const startYear = month >= 8 ? year : year - 1;
  return `KM.${startYear.toString().slice(-2)}-${(startYear + 1).toString().slice(-2)}.`;
}

export async function importProgrammes(
  programmes: ImportedProgramme[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResultRow[]> {
  // Muat sekali: pengguna sedia ada (padanan matrik) + permohonan sedia ada
  // (kunci penduaan + nombor turutan ID).
  const [usersRes, appsRes] = await Promise.all([
    supabase.from('users').select('uid, matricNumber'),
    supabase.from('applications').select('id, applicantId, title, startDate'),
  ]);
  if (usersRes.error) throw new Error(`Gagal memuat senarai pengguna: ${usersRes.error.message}`);
  if (appsRes.error) throw new Error(`Gagal memuat senarai permohonan: ${appsRes.error.message}`);

  const uidByMatric = new Map<string, string>();
  for (const u of (usersRes.data ?? []) as Pick<User, 'uid' | 'matricNumber'>[]) {
    if (u.matricNumber) uidByMatric.set(u.matricNumber.toUpperCase(), u.uid);
  }

  const existingKeys = new Set<string>();
  const seqByPrefix = new Map<string, number>();
  const matricByUid = new Map<string, string>();
  for (const [matric, uid] of uidByMatric) matricByUid.set(uid, matric);
  for (const a of (appsRes.data ?? []) as Pick<
    Application,
    'id' | 'applicantId' | 'title' | 'startDate'
  >[]) {
    const matric = matricByUid.get(a.applicantId) ?? a.applicantId;
    existingKeys.add(dedupeKey(matric, a.title ?? '', a.startDate ?? ''));
    const m = String(a.id).match(/^(KM\.\d{2}-\d{2}\.)(\d+)$/);
    if (m) {
      const seq = parseInt(m[2], 10);
      if (seq > (seqByPrefix.get(m[1]) ?? 0)) seqByPrefix.set(m[1], seq);
    }
  }

  const results: ImportResultRow[] = [];
  let done = 0;

  for (const p of programmes) {
    try {
      const key = dedupeKey(p.student.matric, p.title, p.startDate);
      if (existingKeys.has(key)) {
        results.push({
          programme: p,
          status: 'dilangkau',
          detail: 'Program sudah wujud dalam sistem',
          buktiCreated: 0,
        });
        continue;
      }

      // 1) Pelajar — guna sedia ada (padanan matrik) atau cipta baharu.
      let uid = uidByMatric.get(p.student.matric);
      if (!uid) {
        uid = importedStudentUid(p.student.matric);
        const { error } = await supabase.from('users').upsert(
          {
            uid,
            email:
              p.student.email ?? `${p.student.matric.toLowerCase()}@import.portal-bhep.upm.edu.my`,
            role: 'student',
            name: p.student.name,
            matricNumber: p.student.matric,
            faculty: p.student.faculty ?? null,
            college: p.student.college ?? null,
            createdAt: new Date().toISOString(),
          },
          { onConflict: 'uid' },
        );
        if (error) throw new Error(`pelajar: ${error.message}`);
        uidByMatric.set(p.student.matric, uid);
      }

      // 2) Permohonan (Lulus Sepenuhnya) — ID mengikut sesi tarikh program.
      const prefix = sessionPrefix(p.startDate);
      const nextSeq = (seqByPrefix.get(prefix) ?? 0) + 1;
      seqByPrefix.set(prefix, nextSeq);
      const appId = `${prefix}${String(nextSeq).padStart(3, '0')}`;
      const programmeDate = new Date(p.startDate);

      const application: Application = {
        id: appId,
        applicantId: uid,
        applicantPosition: p.jawatan,
        title: p.title,
        startDate: p.startDate,
        endDate: p.endDate,
        status: 'Lulus Sepenuhnya',
        budget: p.budgetApproved,
        approvedAmount: p.budgetApproved || undefined,
        category: p.kategori,
        organizingLevel: p.peringkat,
        softSkills: p.softSkills,
        objective: p.objektif || `Program ${p.kategori} — diimport daripada rekod Excel.`,
        academicSession: getCurrentAcademicSession(programmeDate),
        semester: getCurrentSemester(programmeDate),
        venue: '',
        speaker: '',
        paperUrl: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const { error: appErr } = await supabase.from('applications').insert(application);
      if (appErr) throw new Error(`permohonan: ${appErr.message}`);
      existingKeys.add(key);

      // 3) Laporan (Disahkan).
      const report: Omit<Report, 'id'> & { id?: string } = {
        applicationId: appId,
        applicantId: uid,
        status: 'Disahkan',
        unionBudgetUsed: p.budgetVerified || p.budgetApproved,
        verifiedBudgetUsed: p.budgetVerified || p.budgetApproved,
        participantCount: p.participants,
        submittedAt: new Date(p.endDate).toISOString(),
        reviewedAt: new Date(p.endDate).toISOString(),
        reviewerComment: 'Diimport daripada rekod Excel.',
      };
      const { data: reportRow, error: repErr } = await supabase
        .from('reports')
        .insert(report)
        .select('id')
        .single();
      if (repErr) throw new Error(`laporan: ${repErr.message}`);

      // 4) Bukti bakat — enjin derivation sebenar (idempotent).
      const buktiCreated = await syncEvidenceForApplication(application, {
        ...report,
        id: reportRow.id as string,
      } as Report);

      results.push({ programme: p, status: 'dicipta', detail: appId, buktiCreated });
    } catch (err) {
      results.push({
        programme: p,
        status: 'ralat',
        detail: err instanceof Error ? err.message : 'Ralat tidak diketahui',
        buktiCreated: 0,
      });
    } finally {
      done += 1;
      onProgress?.(done, programmes.length);
    }
  }

  return results;
}
