// Pembantu TULEN untuk paparan kecerdasan bakat (papan pemuka & profil).
// Semua angka diterbitkan daripada bukti sebenar — tiada statistik rekaan.

import { User } from '../types';
import {
  COMPETENCY_CODES,
  CompetencyCode,
  CompetencyScore,
  Evidence,
  nowISO,
  recalculateStudent,
} from './domain';

// ── Skor keseluruhan & jalur prestasi ───────────────────────────────────────

// Skor Bakat Keseluruhan = purata skor BUKAN SIFAR dalam kalangan 3 skor
// kompetensi tertinggi (1 t.p.). Kompetensi kosong TIDAK mencairkan purata:
// pelajar dengan satu kekuatan 90 mendapat 90, bukan 30 — profil sempit
// tetapi cemerlang tidak dihukum kerana keluasan.
export function overallScore(scores: CompetencyScore[]): number {
  const top = [...scores]
    .map((s) => s.score)
    .sort((a, b) => b - a)
    .slice(0, 3)
    .filter((s) => s > 0);
  if (top.length === 0) return 0;
  return Math.round((top.reduce((a, b) => a + b, 0) / top.length) * 10) / 10;
}

export type Band = 'cemerlang' | 'baik' | 'berkembang' | 'perlu';

export function bandOf(score: number): Band {
  if (score >= 90) return 'cemerlang';
  if (score >= 70) return 'baik';
  if (score >= 50) return 'berkembang';
  return 'perlu';
}

export const BAND_META: Record<Band, { label: string; hex: string; chip: string }> = {
  cemerlang: {
    label: 'Cemerlang (90+)',
    hex: '#059669',
    chip: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  baik: { label: 'Baik (70–89)', hex: '#2563eb', chip: 'text-blue-700 bg-blue-50 border-blue-200' },
  berkembang: {
    label: 'Berkembang (50–69)',
    hex: '#d97706',
    chip: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  perlu: {
    label: 'Perlu Peningkatan (<50)',
    hex: '#dc2626',
    chip: 'text-red-700 bg-red-50 border-red-200',
  },
};

export const HIGH_POTENTIAL_THRESHOLD = 70;

// ── Statistik kohort (papan pemuka admin) ───────────────────────────────────

export interface StudentTalentRow {
  user: User;
  scores: CompetencyScore[];
  overall: number;
  strengths: CompetencyScore[]; // top 3, skor > 0
  approvedCount: number;
}

export interface CompetencyStat {
  code: CompetencyCode;
  studentCount: number; // pelajar dengan skor > 0
  avgScore: number; // purata skor dalam kalangan pelajar tersebut (1 t.p.)
}

export interface CohortStats {
  rows: StudentTalentRow[]; // tertib skor keseluruhan menurun
  approvedEvidenceCount: number;
  programmeCount: number; // program unik yang menjana evidence
  highPotentialCount: number; // overall ≥ 70
  avgOverall: number; // purata skor keseluruhan pelajar yang ada evidence
  withEvidenceCount: number;
  withoutEvidenceCount: number;
  distribution: Record<Band, number>; // pelajar dengan evidence, ikut jalur
  competencyStats: CompetencyStat[]; // tertib bilangan pelajar menurun
}

// `asOf` disuntik supaya laluan tulen ini deterministik sepenuhnya (Faktor
// Masa dikira relatif kepada satu cap masa) — lalai masa nyata untuk UI.
export function computeCohortStats(
  users: User[],
  evidence: Evidence[],
  asOf: string = nowISO(),
): CohortStats {
  const byStudent = new Map<string, Evidence[]>();
  for (const e of evidence) {
    const arr = byStudent.get(e.student_id) ?? [];
    arr.push(e);
    byStudent.set(e.student_id, arr);
  }

  const students = users.filter((u) => u.role === 'student' || byStudent.has(u.uid));

  const rows: StudentTalentRow[] = students
    .map((user) => {
      const ev = byStudent.get(user.uid) ?? [];
      const scores = recalculateStudent(user.uid, COMPETENCY_CODES, ev, asOf);
      const strengths = scores
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      return {
        user,
        scores,
        overall: overallScore(scores),
        strengths,
        approvedCount: ev.filter((e) => e.status === 'approved').length,
      };
    })
    .sort((a, b) => b.overall - a.overall);

  const withEvidence = rows.filter((r) => r.approvedCount > 0);
  const distribution: Record<Band, number> = { cemerlang: 0, baik: 0, berkembang: 0, perlu: 0 };
  for (const r of withEvidence) distribution[bandOf(r.overall)]++;

  const competencyStats: CompetencyStat[] = COMPETENCY_CODES.map((code) => {
    const positive = rows
      .map((r) => r.scores.find((s) => s.competency_id === code)?.score ?? 0)
      .filter((s) => s > 0);
    return {
      code,
      studentCount: positive.length,
      avgScore:
        positive.length === 0
          ? 0
          : Math.round((positive.reduce((a, b) => a + b, 0) / positive.length) * 10) / 10,
    };
  }).sort((a, b) => b.studentCount - a.studentCount || b.avgScore - a.avgScore);

  const approved = evidence.filter((e) => e.status === 'approved');

  return {
    rows,
    approvedEvidenceCount: approved.length,
    programmeCount: new Set(approved.map((e) => e.source_id)).size,
    highPotentialCount: rows.filter((r) => r.overall >= HIGH_POTENTIAL_THRESHOLD).length,
    avgOverall:
      withEvidence.length === 0
        ? 0
        : Math.round((withEvidence.reduce((a, r) => a + r.overall, 0) / withEvidence.length) * 10) /
          10,
    withEvidenceCount: withEvidence.length,
    withoutEvidenceCount: rows.length - withEvidence.length,
    distribution,
    competencyStats,
  };
}

// ── Sorotan berasaskan peraturan (bukan AI — dikira dari data sebenar) ──────

export interface Sorotan {
  title: string;
  body: string;
  tone: 'positive' | 'info' | 'warning';
}

export function computeSorotan(stats: CohortStats): Sorotan[] {
  const out: Sorotan[] = [];
  const named = (code: CompetencyCode) => stats.competencyStats.find((c) => c.code === code);

  const top = stats.competencyStats[0];
  if (top && top.studentCount > 0) {
    out.push({
      title: 'Kompetensi Paling Meluas',
      body: `${top.studentCount} pelajar mempunyai bukti ${nameOf(top.code)} (purata skor ${top.avgScore}).`,
      tone: 'positive',
    });
  }

  const lea = named('LEA');
  if (lea && lea.studentCount > 0) {
    out.push({
      title: 'Prospek Kepimpinan',
      body: `${lea.studentCount} pelajar membina rekod kepimpinan melalui jawatan Pengarah/Setiausaha program yang disahkan.`,
      tone: 'positive',
    });
  }

  const covered = stats.competencyStats.filter((c) => c.studentCount > 0);
  const gap = covered.length > 0 ? covered[covered.length - 1] : undefined;
  if (gap && covered.length > 1) {
    out.push({
      title: `Jurang ${nameOf(gap.code)}`,
      body: `Hanya ${gap.studentCount} pelajar mempunyai bukti ${nameOf(gap.code)} — pertimbangkan program yang menyasarkan kompetensi ini.`,
      tone: 'warning',
    });
  }

  if (stats.withoutEvidenceCount > 0) {
    out.push({
      title: 'Pelajar Belum Berprofil',
      body: `${stats.withoutEvidenceCount} pelajar belum mempunyai bukti — profil bermula apabila program mereka lulus sepenuhnya dan laporannya disahkan.`,
      tone: 'info',
    });
  }

  return out.slice(0, 4);
}

// Ringkasan bakat individu (berasaskan peraturan, bukan AI).
export function talentSummary(
  name: string | undefined,
  row: {
    strengths: CompetencyScore[];
    approvedCount: number;
    programmeCount: number;
  },
): string {
  if (row.strengths.length === 0) return '';
  const who = name ?? 'Pelajar ini';
  const names = row.strengths.slice(0, 2).map((s) => nameOf(s.competency_id));
  const kekuatan = names.length === 2 ? `${names[0]} dan ${names[1]}` : names[0];
  return `${who} menunjukkan kekuatan dalam ${kekuatan}, diterbitkan daripada ${row.approvedCount} bukti yang disahkan merentas ${row.programmeCount} program e-Kesatuan.`;
}

// nama BM kompetensi tanpa import kitaran berat
import { competencyName } from './domain';
function nameOf(code: CompetencyCode): string {
  return competencyName(code);
}
