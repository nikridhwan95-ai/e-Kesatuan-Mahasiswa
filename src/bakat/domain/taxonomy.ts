// Taksonomi kompetensi baseline v1 — 16 entri (SDD §8.4).
// weight_rules: had per-jenis-sumber (§8.5) untuk menghalang "gaming".

import { Competency, CompetencyCode } from './types';

// Had lalai per jenis sumber (mata terkumpul maksimum ke satu kompetensi).
const DEFAULT_CAPS = {
  participation: 25,
  committee_role: 60,
  competition_result: 50,
  certificate: 20,
  achievement: 40,
  manual_endorsement: 15,
} as const;

export const TAXONOMY: Competency[] = [
  {
    code: 'LEA',
    name_ms: 'Kepimpinan',
    name_en: 'Leadership',
    cluster: 'interpersonal',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'COM',
    name_ms: 'Komunikasi',
    name_en: 'Communication',
    cluster: 'interpersonal',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'INN',
    name_ms: 'Inovasi',
    name_en: 'Innovation',
    cluster: 'cognitive',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'TEC',
    name_ms: 'Teknikal',
    name_en: 'Technical',
    cluster: 'execution',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'ENT',
    name_ms: 'Keusahawanan',
    name_en: 'Entrepreneurship',
    cluster: 'execution',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'SPO',
    name_ms: 'Sukan',
    name_en: 'Sports',
    cluster: 'execution',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'ART',
    name_ms: 'Seni Kreatif',
    name_en: 'Creative Arts',
    cluster: 'cognitive',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'RES',
    name_ms: 'Penyelidikan',
    name_en: 'Research',
    cluster: 'cognitive',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'VOL',
    name_ms: 'Kesukarelawanan',
    name_en: 'Volunteerism',
    cluster: 'values',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'CRT',
    name_ms: 'Pemikiran Kritis',
    name_en: 'Critical Thinking',
    cluster: 'cognitive',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'DIG',
    name_ms: 'Kemahiran Digital',
    name_en: 'Digital Skills',
    cluster: 'execution',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'GLO',
    name_ms: 'Pendedahan Global',
    name_en: 'Global Exposure',
    cluster: 'values',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'PRJ',
    name_ms: 'Pengurusan Projek',
    name_en: 'Project Management',
    cluster: 'execution',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'FIN',
    name_ms: 'Literasi Kewangan',
    name_en: 'Financial Literacy',
    cluster: 'execution',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'NEG',
    name_ms: 'Perundingan',
    name_en: 'Negotiation',
    cluster: 'interpersonal',
    weight_rules: DEFAULT_CAPS,
  },
  {
    code: 'NET',
    name_ms: 'Jaringan',
    name_en: 'Networking',
    cluster: 'interpersonal',
    weight_rules: DEFAULT_CAPS,
  },
];

export const TAXONOMY_BY_CODE: Record<CompetencyCode, Competency> = Object.fromEntries(
  TAXONOMY.map((c) => [c.code, c]),
) as Record<CompetencyCode, Competency>;

export const COMPETENCY_CODES: CompetencyCode[] = TAXONOMY.map((c) => c.code);

export function competencyName(code: CompetencyCode): string {
  return TAXONOMY_BY_CODE[code]?.name_ms ?? code;
}
