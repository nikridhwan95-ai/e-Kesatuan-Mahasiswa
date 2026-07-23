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
import { ImportedProgramme, ImportedStudent, importedStudentUid } from './importParser';
import { planProgrammeImport } from './importPlan';
import { APPLICATION_COLUMNS } from './dataService';

// Penanda pada applications.reviewerComment untuk rekod yang dicipta oleh
// import — membolehkan reconcileImportOrphans mengenal pasti baris import
// yang kehilangan laporan (tidak dipaparkan dalam UI: panel catatan hanya
// muncul untuk status Perlu Pembetulan/Ditolak).
export const IMPORT_MARKER = 'Diimport daripada rekod Excel.';

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

export async function importProgrammes(
  programmes: ImportedProgramme[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResultRow[]> {
  // Muat sekali: pengguna sedia ada (padanan matrik) + permohonan sedia ada
  // (kunci penduaan + nombor turutan ID). Keputusan penduaan/padanan/ID
  // dibuat oleh perancang TULEN planProgrammeImport (diuji check:bakat).
  const [usersRes, appsRes] = await Promise.all([
    supabase.from('users').select('uid, matricNumber'),
    supabase.from('applications').select('id, applicantId, title, startDate'),
  ]);
  if (usersRes.error) throw new Error(`Gagal memuat senarai pengguna: ${usersRes.error.message}`);
  if (appsRes.error) throw new Error(`Gagal memuat senarai permohonan: ${appsRes.error.message}`);

  const plan = planProgrammeImport(
    programmes,
    (usersRes.data ?? []) as Pick<User, 'uid' | 'matricNumber'>[],
    (appsRes.data ?? []) as Pick<Application, 'id' | 'applicantId' | 'title' | 'startDate'>[],
  );

  const results: ImportResultRow[] = [];
  let done = 0;

  for (const row of plan) {
    const p = row.programme;
    try {
      if (row.action === 'langkau') {
        results.push({
          programme: p,
          status: 'dilangkau',
          detail: row.reason ?? 'Dilangkau',
          buktiCreated: 0,
        });
        continue;
      }

      const uid = row.uid!;
      const appId = row.appId!;

      // 1) Pelajar — cipta baharu jika perancang menandakannya.
      if (row.createUser) {
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
      }

      // 2) Permohonan (Lulus Sepenuhnya) — ditanda IMPORT_MARKER supaya
      // baris yatim (laporan gagal) boleh dikenal pasti dan dipulihkan.
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
        reviewerComment: IMPORT_MARKER,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const { error: appErr } = await supabase.from('applications').insert(application);
      if (appErr) throw new Error(`permohonan: ${appErr.message}`);

      // 3) Laporan (Disahkan). Jika gagal: padam semula permohonan supaya
      // baris ini boleh diimport semula (tiada yatim kekal-dilangkau).
      const report: Omit<Report, 'id'> & { id?: string } = {
        applicationId: appId,
        applicantId: uid,
        status: 'Disahkan',
        unionBudgetUsed: p.budgetVerified || p.budgetApproved,
        verifiedBudgetUsed: p.budgetVerified || p.budgetApproved,
        participantCount: p.participants,
        submittedAt: new Date(p.endDate).toISOString(),
        reviewedAt: new Date(p.endDate).toISOString(),
        reviewerComment: IMPORT_MARKER,
      };
      const { data: reportRow, error: repErr } = await supabase
        .from('reports')
        .insert(report)
        .select('id')
        .single();
      if (repErr) {
        const { error: undoErr } = await supabase.from('applications').delete().eq('id', appId);
        if (undoErr) {
          throw new Error(
            `laporan: ${repErr.message} (permohonan ${appId} tertinggal — guna 'Pulihkan Import')`,
          );
        }
        throw new Error(`laporan: ${repErr.message}`);
      }

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

// ── Pemulihan yatim import ──────────────────────────────────────────────────
// Permohonan import (IMPORT_MARKER) berstatus Lulus Sepenuhnya yang tiada
// laporan — akibat kegagalan separa sebelum pembetulan susunan tulis —
// dilengkapkan semula: laporan Disahkan dicipta dan bukti bakat dijana.

export interface ReconcileResult {
  checked: number;
  fixed: number;
  failures: { appId: string; message: string }[];
}

export async function reconcileImportOrphans(): Promise<ReconcileResult> {
  const [appsRes, repsRes] = await Promise.all([
    supabase
      .from('applications')
      .select(APPLICATION_COLUMNS)
      .eq('status', 'Lulus Sepenuhnya')
      .eq('reviewerComment', IMPORT_MARKER),
    supabase.from('reports').select('applicationId'),
  ]);
  if (appsRes.error) throw new Error(`Gagal memuat permohonan: ${appsRes.error.message}`);
  if (repsRes.error) throw new Error(`Gagal memuat laporan: ${repsRes.error.message}`);

  const withReport = new Set((repsRes.data ?? []).map((r) => String(r.applicationId)));
  const orphans = ((appsRes.data ?? []) as unknown as Application[]).filter(
    (a) => !withReport.has(a.id),
  );

  const result: ReconcileResult = { checked: orphans.length, fixed: 0, failures: [] };

  for (const app of orphans) {
    try {
      const when = new Date(app.endDate || app.startDate);
      const budget = app.approvedAmount ?? app.budget;
      const report: Omit<Report, 'id'> & { id?: string } = {
        applicationId: app.id,
        applicantId: app.applicantId,
        status: 'Disahkan',
        unionBudgetUsed: budget,
        verifiedBudgetUsed: budget,
        submittedAt: (Number.isNaN(when.getTime()) ? new Date() : when).toISOString(),
        reviewedAt: (Number.isNaN(when.getTime()) ? new Date() : when).toISOString(),
        reviewerComment: IMPORT_MARKER,
      };
      const { data: reportRow, error: repErr } = await supabase
        .from('reports')
        .insert(report)
        .select('id')
        .single();
      if (repErr) throw new Error(repErr.message);

      await syncEvidenceForApplication(app, { ...report, id: reportRow.id as string } as Report);
      result.fixed += 1;
    } catch (err) {
      result.failures.push({
        appId: app.id,
        message: err instanceof Error ? err.message : 'Ralat tidak diketahui',
      });
    }
  }

  return result;
}
