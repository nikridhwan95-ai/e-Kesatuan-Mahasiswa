// JAMBATAN INTEGRASI e-Kesatuan → Modul Bakat.
// Fungsi TULEN yang menterjemah fakta e-Kesatuan (permohonan yang Lulus
// Sepenuhnya + laporan pascaprogram yang Disahkan) kepada rekod Evidence.
//
// Evidence terbitan lahir dengan status 'approved' kerana fakta asalnya telah
// melalui rantaian kelulusan penuh e-Kesatuan (Unit Semakan → Pembentangan →
// YDP → TNC HEPA) DAN laporan pascaprogram disahkan oleh Unit Pelaporan.
//
// ID evidence adalah deterministik (appId + jenis sumber + kompetensi) supaya
// penjanaan semula bersifat idempotent — rekod sedia ada tidak diganda.

import { Application, Report } from '../types';
import {
  CompetencyCode,
  Evidence,
  ProgrammeLevel,
  RoleType,
} from './domain';

// Peringkat Penganjuran e-Kesatuan → ProgrammeLevel SDD.
// 'Negeri' tiada padanan langsung dalam SDD (4 peringkat sahaja) — dipetakan
// ke 'national' sebagai peringkat terdekat.
export const LEVEL_MAP: Record<string, ProgrammeLevel> = {
  'Antarabangsa': 'international',
  'Kebangsaan': 'national',
  'Negeri': 'national',
  'Universiti': 'university',
  'Kolej atau Fakulti': 'faculty',
};

// Jawatan Pemohon e-Kesatuan → RoleType SDD (Appendix C).
export const ROLE_MAP: Record<string, RoleType> = {
  'Pengarah': 'chairperson',
  'Setiausaha': 'secretary',
};

// Kategori program (8 Teras) → kompetensi utama yang dibina oleh program itu.
export const CATEGORY_COMPETENCY: Record<string, CompetencyCode> = {
  'Kesukarelawanan': 'VOL',
  'Kepimpinan': 'LEA',
  'Kebudayaan': 'ART',
  'Sukan': 'SPO',
  'Keusahawanan': 'ENT',
  'Akademik & Intelektual': 'RES',
  'Kerohanian': 'VOL',
  'Kelestarian & Alam Sekitar': 'VOL',
};

// Kemahiran Insaniah (borang permohonan) → kompetensi SDD.
export const SOFTSKILL_COMPETENCY: Record<string, CompetencyCode> = {
  'Kemahiran Berkomunikasi': 'COM',
  'Pemikiran Kritis dan Kemahiran Penyelesaian Masalah': 'CRT',
  'Kemahiran Kerja Berpasukan': 'NET',
  'Pembelajaran Berterusan dan Pengurusan Maklumat': 'DIG',
  'Kemahiran Keusahawanan': 'ENT',
  'Etika dan Moral Profesional': 'VOL',
  'Kemahiran Kepimpinan': 'LEA',
};

// Program yang layak menjana evidence: diluluskan sepenuhnya DAN laporannya
// telah disahkan oleh Unit Pelaporan.
export function qualifiesForEvidence(app: Application, report: Report | undefined): boolean {
  return app.status === 'Lulus Sepenuhnya' && report?.status === 'Disahkan';
}

export function evidenceId(appId: string, sourceType: string, competency: CompetencyCode): string {
  // ID permohonan e-Kesatuan (cth "KM.25-26.001") selamat digunakan terus.
  return `${appId}__${sourceType}__${competency}`;
}

function toISO(date: string | undefined, fallback: string): string {
  const d = date && !Number.isNaN(new Date(date).getTime()) ? date : fallback;
  return new Date(d).toISOString();
}

// Terbitkan semua rekod Evidence bagi SATU program yang layak.
// Memulangkan [] jika program belum layak.
export function deriveEvidence(app: Application, report: Report | undefined): Evidence[] {
  if (!qualifiesForEvidence(app, report)) return [];

  const level = app.organizingLevel ? LEVEL_MAP[app.organizingLevel] : undefined;
  const role = app.applicantPosition ? ROLE_MAP[app.applicantPosition] : undefined;
  const eventDate = toISO(app.endDate || app.startDate, app.updatedAt || app.createdAt);
  const approvedAt = toISO(report?.reviewedAt, eventDate);
  const roleLabel = app.applicantPosition === 'Pengarah' ? 'Pengarah Program' : 'Setiausaha Program';

  const rows: Evidence[] = [];
  const seen = new Set<string>(); // "sourceType:competency" — elak rekod berganda

  function push(e: {
    source_type: Evidence['source_type'];
    competency_id: CompetencyCode;
    points: number;
    narrative: string;
    withRole?: boolean;
  }) {
    const key = `${e.source_type}:${e.competency_id}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      id: evidenceId(app.id, e.source_type, e.competency_id),
      student_id: app.applicantId,
      source_type: e.source_type,
      source_id: app.id,
      competency_id: e.competency_id,
      points: e.points,
      weight_factors: {
        ...(e.withRole && role ? { role } : {}),
        ...(level ? { level } : {}),
      },
      ai_confidence: null,
      status: 'approved',
      approved_by: 'e-kesatuan:unit_pelaporan',
      approved_at: approvedAt,
      superseded_by: null,
      narrative: e.narrative,
      event_date: eventDate,
    });
  }

  // 1) Kepimpinan — mengetuai/mengurusetiakan program yang berjaya dilaksana.
  if (role) {
    push({
      source_type: 'committee_role',
      competency_id: 'LEA',
      points: 8,
      narrative: `${roleLabel} — ${app.title}`,
      withRole: true,
    });

    // 2) Pengurusan Projek — merancang, memohon, melaksana & melapor program.
    push({
      source_type: 'committee_role',
      competency_id: 'PRJ',
      points: 7,
      narrative: `Pengurusan program dari permohonan hingga laporan — ${app.title}`,
      withRole: true,
    });

    // 3) Literasi Kewangan — mengurus bajet & penyata perbelanjaan yang disahkan.
    const budget = report?.verifiedBudgetUsed ?? app.approvedAmount ?? app.budget;
    if (budget && budget > 0) {
      push({
        source_type: 'committee_role',
        competency_id: 'FIN',
        points: 4,
        narrative: `Pengurusan bajet program (RM${budget.toLocaleString('ms-MY')}) — ${app.title}`,
        withRole: true,
      });
    }
  }

  // 4) Kompetensi teras kategori program (8 Teras).
  const categoryComp = CATEGORY_COMPETENCY[app.category];
  if (categoryComp) {
    push({
      source_type: 'achievement',
      competency_id: categoryComp,
      points: 6,
      narrative: `Program teras ${app.category} — ${app.title}`,
    });
  }

  // 5) Kemahiran insaniah yang dideklarasikan dalam permohonan (impak program).
  for (const skill of app.softSkills ?? []) {
    const comp = SOFTSKILL_COMPETENCY[skill];
    if (!comp) continue;
    push({
      source_type: 'achievement',
      competency_id: comp,
      points: 3,
      narrative: `${skill} — ${app.title}`,
    });
  }

  return rows;
}
