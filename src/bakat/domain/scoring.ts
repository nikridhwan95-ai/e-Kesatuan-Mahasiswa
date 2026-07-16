// Enjin skor Bakat — fungsi TULEN & DETERMINISTIK (tiada AI pada masa skor).
// SDD §8.5: skor(student, kompetensi) =
//   min(100, Σ evidence 'approved':
//        points × role × level × attendance × recency_decay )
//   tertakluk pada per-source-type caps.
//
// IRON RULE (§4.4): ini SATU-SATUNYA tempat CompetencyScore boleh dihasilkan.
// Evidence bukan 'approved' TIDAK menyumbang.

import {
  CompetencyCode,
  CompetencyScore,
  Evidence,
  EvidenceSourceType,
} from './types';
import { TAXONOMY_BY_CODE } from './taxonomy';
import {
  ENGINE_VERSION,
  LEVEL_MULTIPLIER,
  nowISO,
  RECENCY_HALF_LIFE_MONTHS,
  ROLE_MULTIPLIER,
} from './multipliers';

const MS_PER_MONTH = (365.25 / 12) * 24 * 60 * 60 * 1000;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Faktor kehadiran: linear 0.5–1.0 (100% → 1.0, 0% → 0.5). Tiada data → 1.0.
export function attendanceFactor(pct: number | undefined): number {
  if (pct === undefined || pct === null) return 1;
  const clamped = Math.max(0, Math.min(100, pct));
  return 0.5 + 0.5 * (clamped / 100);
}

// Decay recency: 0.5^(bulan_lalu / half_life). Acara masa depan → tiada boost (cap 1.0).
export function recencyDecay(eventDate: string, now: string = nowISO()): number {
  const monthsAgo = (new Date(now).getTime() - new Date(eventDate).getTime()) / MS_PER_MONTH;
  if (monthsAgo <= 0) return 1;
  return Math.pow(0.5, monthsAgo / RECENCY_HALF_LIFE_MONTHS);
}

export interface Contribution {
  evidence: Evidence;
  raw: number; // points × role × level × attendance × decay (sebelum cap)
  roleMult: number;
  levelMult: number;
  attendance: number;
  decay: number;
  effective: number; // selepas per-source cap & cap keseluruhan 100 (dibundar 1dp)
}

export interface ScoreBreakdown {
  student_id: string;
  competency_id: CompetencyCode;
  score: number; // == Σ effective (dibundar 1dp) — kriteria SCR-02
  evidence_count: number;
  last_evidence_at: string | null;
  engine_version: string;
  contributions: Contribution[]; // bertertib mengikut sumbangan menurun
  capped: boolean; // benar jika mana-mana cap terpakai
}

// Kira pecahan skor SATU kompetensi untuk SATU pelajar, termasuk sumbangan
// per-evidence yang menjumlah TEPAT kepada skor paksi (untuk drill-down).
export function scoreBreakdown(
  studentId: string,
  competency: CompetencyCode,
  evidence: Evidence[],
  now: string = nowISO()
): ScoreBreakdown {
  const approved = evidence.filter(
    (e) =>
      e.student_id === studentId &&
      e.competency_id === competency &&
      e.status === 'approved'
  );

  const caps = TAXONOMY_BY_CODE[competency]?.weight_rules ?? {};

  // 1) Sumbangan mentah per evidence.
  const rows = approved.map((e) => {
    const roleMult = e.weight_factors.role ? ROLE_MULTIPLIER[e.weight_factors.role] : 1;
    const levelMult = e.weight_factors.level ? LEVEL_MULTIPLIER[e.weight_factors.level] : 1;
    const attendance = attendanceFactor(e.weight_factors.attendance_pct);
    const decay = recencyDecay(e.event_date, now);
    const raw = e.points * roleMult * levelMult * attendance * decay;
    return { evidence: e, roleMult, levelMult, attendance, decay, raw };
  });

  // 2) Cap per jenis-sumber: skala turun setiap kumpulan secara berkadar jika melebihi cap.
  let capped = false;
  const bySource = new Map<EvidenceSourceType, typeof rows>();
  for (const r of rows) {
    const arr = bySource.get(r.evidence.source_type) ?? [];
    arr.push(r);
    bySource.set(r.evidence.source_type, arr);
  }
  const afterSourceCap = new Map<string, number>(); // evidence.id → nilai selepas cap sumber
  for (const [src, arr] of bySource) {
    const sum = arr.reduce((a, r) => a + r.raw, 0);
    const cap = caps[src] ?? Infinity;
    const scale = sum > cap ? cap / sum : 1;
    if (scale < 1) capped = true;
    for (const r of arr) afterSourceCap.set(r.evidence.id, r.raw * scale);
  }

  // 3) Cap keseluruhan pada 100: skala berkadar jika jumlah melebihi 100.
  const totalAfterSource = rows.reduce((a, r) => a + (afterSourceCap.get(r.evidence.id) ?? 0), 0);
  const overallScale = totalAfterSource > 100 ? 100 / totalAfterSource : 1;
  if (overallScale < 1) capped = true;

  // 4) Sumbangan berkesan (dibundar 1dp) — skor = jumlahnya (sama tepat).
  const contributions: Contribution[] = rows
    .map((r) => ({
      evidence: r.evidence,
      raw: r.raw,
      roleMult: r.roleMult,
      levelMult: r.levelMult,
      attendance: r.attendance,
      decay: r.decay,
      effective: round1((afterSourceCap.get(r.evidence.id) ?? 0) * overallScale),
    }))
    .sort((a, b) => b.effective - a.effective);

  const score = round1(contributions.reduce((a, c) => a + c.effective, 0));

  const lastEvidenceAt =
    approved.length === 0
      ? null
      : approved
          .map((e) => e.event_date)
          .sort()
          .at(-1) ?? null;

  return {
    student_id: studentId,
    competency_id: competency,
    score,
    evidence_count: approved.length,
    last_evidence_at: lastEvidenceAt,
    engine_version: ENGINE_VERSION,
    contributions,
    capped,
  };
}

// Kira semula SEMUA kompetensi bagi seorang pelajar (analog fn_recalculate_student).
export function recalculateStudent(
  studentId: string,
  competencies: CompetencyCode[],
  evidence: Evidence[],
  now: string = nowISO()
): CompetencyScore[] {
  return competencies.map((code) => {
    const b = scoreBreakdown(studentId, code, evidence, now);
    return {
      student_id: b.student_id,
      competency_id: b.competency_id,
      score: b.score,
      evidence_count: b.evidence_count,
      last_evidence_at: b.last_evidence_at,
      engine_version: b.engine_version,
    };
  });
}
