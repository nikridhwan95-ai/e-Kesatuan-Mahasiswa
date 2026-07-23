// Peraturan kitaran hayat evidence (§7.1 evidence immutability).
// Fungsi tulen: memulangkan senarai evidence BAHARU (append-only; tiada mutasi tempat).

import { Evidence, EvidenceStatus } from './types';

// Hanya evidence 'approved' menyumbang kepada skor (digunakan oleh enjin).
export function contributes(e: Evidence): boolean {
  return e.status === 'approved';
}

// Dispute: bekukan sumbangan dgn menukar status → 'disputed'. Enjin lalu
// mengecualikannya pada pengiraan semula seterusnya (kesan segera dilihat).
export function disputeEvidence(evidence: Evidence[], evidenceId: string): Evidence[] {
  return evidence.map((e) =>
    e.id === evidenceId ? { ...e, status: 'disputed' as EvidenceStatus } : e,
  );
}

// Void + gantian (§7.1): rekod asal ditanda void & 'superseded_by'; rekod ganti
// ditambah (append-only). Tiada UPDATE pada lajur skor.
export function voidAndReplace(
  evidence: Evidence[],
  targetId: string,
  replacement: Evidence,
): Evidence[] {
  const next = evidence.map((e) =>
    e.id === targetId
      ? { ...e, status: 'void' as EvidenceStatus, superseded_by: replacement.id }
      : e,
  );
  return [...next, replacement];
}
