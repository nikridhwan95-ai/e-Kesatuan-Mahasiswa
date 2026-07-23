// Servis Supabase untuk jadual 'evidence' (Modul Bakat).
//
// Prinsip storan (IRON RULE §4.4): HANYA evidence disimpan — skor kompetensi
// TIDAK PERNAH ditulis ke pangkalan data. Skor sentiasa dikira semula oleh
// enjin dalam src/bakat/domain/scoring.ts daripada bukti 'approved'.

import { supabase } from '../supabase';
import { Application, Report } from '../types';
import { Evidence } from './domain';
import { deriveEvidence } from './derive';

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'ralat tidak diketahui'}`);
}

// Kontrak lajur eksplisit — sepadan dengan jenis Evidence (domain/types.ts).
const EVIDENCE_COLUMNS =
  'id,student_id,source_type,source_id,competency_id,points,weight_factors,ai_confidence,status,approved_by,approved_at,superseded_by,narrative,event_date';

export async function getEvidenceForStudent(uid: string): Promise<Evidence[]> {
  const { data, error } = await supabase
    .from('evidence')
    .select(EVIDENCE_COLUMNS)
    .eq('student_id', uid);
  if (error) fail('getEvidenceForStudent', error);
  return (data ?? []) as unknown as Evidence[];
}

export async function getAllEvidence(): Promise<Evidence[]> {
  const { data, error } = await supabase.from('evidence').select(EVIDENCE_COLUMNS);
  if (error) fail('getAllEvidence', error);
  return (data ?? []) as unknown as Evidence[];
}

// Dispute (pelajar): bekukan sumbangan evidence. Rekod TIDAK dipadam —
// statusnya sahaja bertukar; enjin mengecualikannya pada kiraan seterusnya.
export async function disputeEvidenceDoc(evidenceId: string): Promise<void> {
  const { error } = await supabase
    .from('evidence')
    .update({ status: 'disputed' })
    .eq('id', evidenceId);
  if (error) fail('disputeEvidenceDoc', error);
}

// Jana & simpan evidence bagi SATU program yang layak (idempotent).
// ON CONFLICT DO NOTHING — rekod sedia ada TIDAK ditulis semula: evidence
// bersifat tidak boleh diubah, dan status dispute/void yang ditetapkan mesti kekal.
export async function syncEvidenceForApplication(
  app: Application,
  report: Report | undefined,
): Promise<number> {
  const derived = deriveEvidence(app, report);
  if (derived.length === 0) return 0;

  const { data, error } = await supabase
    .from('evidence')
    .upsert(derived, { onConflict: 'id', ignoreDuplicates: true })
    .select('id');
  if (error) fail('syncEvidenceForApplication', error);
  return (data ?? []).length;
}

// Backfill (admin): imbas SEMUA permohonan Lulus Sepenuhnya dengan laporan
// Disahkan dan jana evidence yang belum wujud. Selamat diulang bila-bila masa.
export async function syncAllEvidence(): Promise<{ programmes: number; created: number }> {
  const [appsRes, reportsRes] = await Promise.all([
    supabase.from('applications').select('*').eq('status', 'Lulus Sepenuhnya'),
    supabase.from('reports').select('*').eq('status', 'Disahkan'),
  ]);
  if (appsRes.error) fail('syncAllEvidence(applications)', appsRes.error);
  if (reportsRes.error) fail('syncAllEvidence(reports)', reportsRes.error);

  const apps = (appsRes.data ?? []) as Application[];
  const reports = (reportsRes.data ?? []) as Report[];
  const reportByApp = new Map(reports.map((r) => [r.applicationId, r]));

  let programmes = 0;
  let created = 0;
  for (const app of apps) {
    const report = reportByApp.get(app.id);
    if (!report) continue;
    const n = await syncEvidenceForApplication(app, report);
    if (n > 0) programmes++;
    created += n;
  }
  return { programmes, created };
}
