// Servis Firestore untuk koleksi 'evidence' (Modul Bakat).
//
// Prinsip storan (IRON RULE §4.4): HANYA evidence disimpan — skor kompetensi
// TIDAK PERNAH ditulis ke Firestore. Skor sentiasa dikira semula oleh enjin
// dalam src/bakat/domain/scoring.ts daripada evidence 'approved'.

import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { Application, Report } from '../types';
import { Evidence } from './domain';
import { deriveEvidence } from './derive';

const EVIDENCE_COLLECTION = 'evidence';

export async function getEvidenceForStudent(uid: string): Promise<Evidence[]> {
  const q = query(collection(db, EVIDENCE_COLLECTION), where('student_id', '==', uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ ...(d.data() as Evidence), id: d.id }));
}

export async function getAllEvidence(): Promise<Evidence[]> {
  const snapshot = await getDocs(collection(db, EVIDENCE_COLLECTION));
  return snapshot.docs.map((d) => ({ ...(d.data() as Evidence), id: d.id }));
}

// Dispute (pelajar): bekukan sumbangan evidence. Rekod TIDAK dipadam —
// statusnya sahaja bertukar; enjin mengecualikannya pada kiraan seterusnya.
export async function disputeEvidenceDoc(evidenceId: string): Promise<void> {
  await updateDoc(doc(db, EVIDENCE_COLLECTION, evidenceId), { status: 'disputed' });
}

// Jana & simpan evidence bagi SATU program yang layak (idempotent).
// Rekod sedia ada TIDAK ditulis semula — evidence bersifat tak boleh ubah,
// dan status dispute/void yang telah ditetapkan mesti kekal.
export async function syncEvidenceForApplication(
  app: Application,
  report: Report | undefined
): Promise<number> {
  const derived = deriveEvidence(app, report);
  let created = 0;
  for (const evidence of derived) {
    const ref = doc(db, EVIDENCE_COLLECTION, evidence.id);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;
    await setDoc(ref, evidence);
    created++;
  }
  return created;
}

// Backfill (admin): imbas SEMUA permohonan Lulus Sepenuhnya dengan laporan
// Disahkan dan jana evidence yang belum wujud. Selamat diulang bila-bila masa.
export async function syncAllEvidence(): Promise<{ programmes: number; created: number }> {
  const [appsSnap, reportsSnap] = await Promise.all([
    getDocs(query(collection(db, 'applications'), where('status', '==', 'Lulus Sepenuhnya'))),
    getDocs(query(collection(db, 'reports'), where('status', '==', 'Disahkan'))),
  ]);

  const apps = appsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as Application));
  const reports = reportsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as Report));
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
