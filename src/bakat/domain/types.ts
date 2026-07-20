// MODUL BAKAT — jenis domain teras (TS tulen, bebas kerangka).
// Diport dari Portal Bakat UPM (TalentOS, SDD v2.0 §7.3). Union literal digunakan
// (bukan enum) supaya kekal ringan dan mudah diserikan ke Firestore.

// ── Taksonomi kompetensi (§8.4) ─────────────────────────────────────────────
export type CompetencyCode =
  | 'LEA' | 'COM' | 'INN' | 'TEC' | 'ENT' | 'SPO' | 'ART' | 'RES'
  | 'VOL' | 'CRT' | 'DIG' | 'GLO' | 'PRJ' | 'FIN' | 'NEG' | 'NET';

export type CompetencyCluster =
  | 'cognitive'
  | 'interpersonal'
  | 'execution'
  | 'values';

export interface Competency {
  code: CompetencyCode;
  name_ms: string;
  name_en: string;
  cluster: CompetencyCluster;
  // Had per-jenis-sumber (§8.5 "per-source caps"): mata maksimum yang boleh
  // disumbangkan oleh satu jenis sumber kepada kompetensi ini.
  weight_rules: Partial<Record<EvidenceSourceType, number>>;
}

// ── Peranan & peringkat (Appendix C) ────────────────────────────────────────
export type RoleType =
  | 'participant'
  | 'volunteer'
  | 'committee'
  | 'secretary'
  | 'treasurer'
  | 'vice_chair'
  | 'chairperson'; // termasuk Pengarah Program

export type ProgrammeLevel =
  | 'faculty'
  | 'university'
  | 'national'
  | 'international';

// ── Sumber & status evidence (§7.3) ─────────────────────────────────────────
export type EvidenceSourceType =
  | 'participation'
  | 'committee_role'
  | 'competition_result'
  | 'certificate'
  | 'achievement'
  | 'manual_endorsement';

export type EvidenceStatus = 'pending' | 'approved' | 'disputed' | 'void';

// THE central record (§7.3 evidence) — satu rekod yang tidak boleh diubah per delta
// kompetensi per fakta. Skor TIDAK PERNAH disimpan (IRON RULE §4.4); ia
// sentiasa diterbitkan semula oleh enjin skor daripada evidens 'approved'.
// Dalam portal bersepadu ini: student_id = users.uid (Firebase Auth) dan
// source_id merujuk kepada applications.id e-Kesatuan bagi evidence terbitan.
export interface Evidence {
  id: string;
  student_id: string;
  source_type: EvidenceSourceType;
  source_id: string; // rujukan polimorfik (cth applications.id)
  competency_id: CompetencyCode;
  points: number; // 0–10 mata mentah sebelum decay/cap
  weight_factors: {
    role?: RoleType;
    level?: ProgrammeLevel;
    attendance_pct?: number; // 0–100
  };
  ai_confidence: number | null; // keyakinan pemetaan AI; null jika bukan AI
  status: EvidenceStatus;
  approved_by: string | null;
  approved_at: string | null;
  superseded_by: string | null; // ditetapkan bila void & diganti
  narrative: string; // satu baris untuk drill-down
  event_date: string; // ISO — bila fakta berlaku (untuk decay)
}

// Skor terbitan — output tulen enjin skor (§7.3 competency_scores).
// Dikira semula pada masa nyata; TIDAK disimpan dalam Firestore.
export interface CompetencyScore {
  student_id: string;
  competency_id: CompetencyCode;
  score: number; // 0–100 selepas wajaran, decay, cap
  evidence_count: number; // rekod 'approved' yang menyumbang
  last_evidence_at: string | null;
  engine_version: string;
}
