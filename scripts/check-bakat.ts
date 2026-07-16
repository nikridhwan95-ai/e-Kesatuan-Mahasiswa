// Semakan sifat Modul Bakat (enjin skor + derivation e-Kesatuan → evidence).
// Dijalankan dengan: npm run check:bakat
// Mengesahkan IRON RULE & sifat matematik enjin tanpa kerangka ujian berat.

import {
  COMPETENCY_CODES,
  recalculateStudent,
  scoreBreakdown,
  Evidence,
} from '../src/bakat/domain';
import { deriveEvidence, qualifiesForEvidence, LEVEL_MAP, ROLE_MAP } from '../src/bakat/derive';
import { bandOf, overallScore } from '../src/bakat/insights';
import { Application, Report } from '../src/types';

let failures = 0;
function assert(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ok   ${name}`);
  } else {
    console.error(`  FAIL ${name}`);
    failures++;
  }
}

const NOW = '2026-07-16T00:00:00.000Z';

function ev(partial: Partial<Evidence> & { id: string }): Evidence {
  return {
    student_id: 'S1',
    source_type: 'committee_role',
    source_id: 'P1',
    competency_id: 'LEA',
    points: 5,
    weight_factors: {},
    ai_confidence: null,
    status: 'approved',
    approved_by: 'O1',
    approved_at: NOW,
    superseded_by: null,
    narrative: 'test',
    event_date: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

console.log('Enjin skor:');

// 1) IRON RULE: hanya 'approved' menyumbang.
{
  const base = [ev({ id: 'e1', status: 'approved', points: 6 })];
  const withPending = [...base, ev({ id: 'e2', status: 'pending', points: 10 })];
  const withVoid = [...base, ev({ id: 'e3', status: 'void', points: 10 })];
  const withDisputed = [...base, ev({ id: 'e4', status: 'disputed', points: 10 })];
  const s0 = scoreBreakdown('S1', 'LEA', base, NOW).score;
  assert('evidence pending tidak menyumbang', scoreBreakdown('S1', 'LEA', withPending, NOW).score === s0);
  assert('evidence void tidak menyumbang', scoreBreakdown('S1', 'LEA', withVoid, NOW).score === s0);
  assert('evidence disputed tidak menyumbang', scoreBreakdown('S1', 'LEA', withDisputed, NOW).score === s0);
}

// 2) Monotonik: menambah evidence 'approved' tidak menurunkan skor.
{
  const a = [ev({ id: 'e1', points: 4 })];
  const b = [...a, ev({ id: 'e2', points: 4, source_type: 'certificate' })];
  assert('menambah evidence approved tidak menurunkan skor', scoreBreakdown('S1', 'LEA', b, NOW).score >= scoreBreakdown('S1', 'LEA', a, NOW).score);
}

// 3) Cap pada 100.
{
  const many = Array.from({ length: 40 }, (_, i) =>
    ev({ id: `e${i}`, points: 10, source_type: 'achievement', weight_factors: { level: 'international', role: 'chairperson' } })
  );
  assert('skor dihadkan pada 100', scoreBreakdown('S1', 'LEA', many, NOW).score <= 100);
}

// 4) Decay: evidence lama menyumbang kurang daripada yang baharu (points sama).
{
  const recent = [ev({ id: 'r', points: 6, event_date: '2026-06-01T00:00:00.000Z' })];
  const old = [ev({ id: 'o', points: 6, event_date: '2022-06-01T00:00:00.000Z' })];
  assert('recency decay mengurangkan evidence lama', scoreBreakdown('S1', 'LEA', recent, NOW).score > scoreBreakdown('S1', 'LEA', old, NOW).score);
}

// 5) Jumlah sumbangan berkesan == skor paksi (tepat) — kriteria drill-down.
{
  const mixed = [
    ev({ id: 'a', points: 8, source_type: 'committee_role', weight_factors: { role: 'chairperson', level: 'national', attendance_pct: 90 } }),
    ev({ id: 'b', points: 5, source_type: 'participation', weight_factors: { role: 'participant', level: 'university', attendance_pct: 100 } }),
    ev({ id: 'c', points: 7, source_type: 'competition_result', weight_factors: { level: 'international' } }),
  ];
  const bd = scoreBreakdown('S1', 'LEA', mixed, NOW);
  const sum = Math.round(bd.contributions.reduce((a, c) => a + c.effective, 0) * 10) / 10;
  assert('jumlah sumbangan dipapar == skor paksi', sum === bd.score);
}

// 6) Pendarab peranan & peringkat meningkatkan sumbangan.
{
  const low = [ev({ id: 'l', points: 5, weight_factors: { role: 'participant', level: 'faculty' } })];
  const high = [ev({ id: 'h', points: 5, weight_factors: { role: 'chairperson', level: 'international' } })];
  assert('peranan+peringkat lebih tinggi = sumbangan lebih tinggi', scoreBreakdown('S1', 'LEA', high, NOW).score > scoreBreakdown('S1', 'LEA', low, NOW).score);
}

// 7) recalculateStudent memulangkan satu skor per kompetensi.
{
  const scores = recalculateStudent('S1', COMPETENCY_CODES, [ev({ id: 'x' })], NOW);
  assert('satu skor per kompetensi', scores.length === COMPETENCY_CODES.length);
}

console.log('\nDerivation e-Kesatuan → evidence:');

function app(partial?: Partial<Application>): Application {
  return {
    id: 'KM.25-26.001',
    applicantId: 'UID1',
    applicantPosition: 'Pengarah',
    title: 'Karnival Sukan Antara Kolej',
    startDate: '2026-03-01',
    endDate: '2026-03-03',
    status: 'Lulus Sepenuhnya',
    budget: 5000,
    approvedAmount: 4500,
    category: 'Sukan',
    organizingLevel: 'Universiti',
    softSkills: ['Kemahiran Kepimpinan', 'Kemahiran Kerja Berpasukan'],
    objective: 'test',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-03-05T00:00:00.000Z',
    ...partial,
  };
}

function report(partial?: Partial<Report>): Report {
  return {
    id: 'R1',
    applicationId: 'KM.25-26.001',
    applicantId: 'UID1',
    status: 'Disahkan',
    verifiedBudgetUsed: 4200,
    reviewedAt: '2026-03-20T00:00:00.000Z',
    ...partial,
  };
}

// 8) Hanya program Lulus Sepenuhnya + laporan Disahkan yang layak.
{
  assert('lulus + disahkan layak', qualifiesForEvidence(app(), report()));
  assert('permohonan belum lulus tidak layak', deriveEvidence(app({ status: 'Menunggu Semakan' }), report()).length === 0);
  assert('laporan belum disahkan tidak layak', deriveEvidence(app(), report({ status: 'Dihantar' })).length === 0);
  assert('tiada laporan tidak layak', deriveEvidence(app(), undefined).length === 0);
}

// 9) Evidence terbitan: status approved, ID deterministik (idempotent).
{
  const rows1 = deriveEvidence(app(), report());
  const rows2 = deriveEvidence(app(), report());
  assert('sekurang-kurangnya LEA+PRJ+FIN+kategori dijana', rows1.length >= 4);
  assert('semua evidence terbitan berstatus approved', rows1.every((e) => e.status === 'approved'));
  assert('ID deterministik — jana semula memberi ID sama', rows1.map((e) => e.id).join() === rows2.map((e) => e.id).join());
  assert('ID unik dalam satu program', new Set(rows1.map((e) => e.id)).size === rows1.length);
  assert('student_id = applicantId', rows1.every((e) => e.student_id === 'UID1'));
  assert('source_id = applications.id', rows1.every((e) => e.source_id === 'KM.25-26.001'));
}

// 10) Pemetaan peranan & peringkat betul.
{
  const rows = deriveEvidence(app(), report());
  const lea = rows.find((e) => e.competency_id === 'LEA' && e.source_type === 'committee_role')!;
  assert('Pengarah → chairperson', lea.weight_factors.role === 'chairperson');
  assert('Universiti → university', lea.weight_factors.level === 'university');
  const sec = deriveEvidence(app({ applicantPosition: 'Setiausaha' }), report())
    .find((e) => e.competency_id === 'LEA')!;
  assert('Setiausaha → secretary', sec.weight_factors.role === 'secretary');
  assert('semua peringkat e-Kesatuan dipetakan', ['Antarabangsa', 'Kebangsaan', 'Negeri', 'Universiti', 'Kolej atau Fakulti'].every((l) => LEVEL_MAP[l] !== undefined));
  assert('semua jawatan pemohon dipetakan', ['Pengarah', 'Setiausaha'].every((r) => ROLE_MAP[r] !== undefined));
}

// 11) Dedupe: kategori & kemahiran insaniah yang jatuh pada kompetensi sama
//     tidak menjana dua rekod achievement untuk kompetensi itu.
{
  const rows = deriveEvidence(
    app({ category: 'Keusahawanan', softSkills: ['Kemahiran Keusahawanan'] }),
    report()
  );
  const entAchievements = rows.filter((e) => e.competency_id === 'ENT' && e.source_type === 'achievement');
  assert('tiada rekod berganda kompetensi sama', entAchievements.length === 1);
}

// 12) Kategori Sukan menjana evidence SPO; kemahiran insaniah dipetakan.
{
  const rows = deriveEvidence(app(), report());
  assert('kategori Sukan → SPO', rows.some((e) => e.competency_id === 'SPO'));
  assert('Kemahiran Kerja Berpasukan → NET', rows.some((e) => e.competency_id === 'NET'));
  assert('bajet disahkan → FIN', rows.some((e) => e.competency_id === 'FIN'));
}

console.log('\nSkor keseluruhan & jalur:');

// 13) Skor keseluruhan = purata 3 skor tertinggi; 0 tanpa evidence.
{
  const scores = recalculateStudent('S1', COMPETENCY_CODES, [
    ev({ id: 'a', competency_id: 'LEA', points: 8, weight_factors: { role: 'chairperson', level: 'national' }, event_date: NOW }),
    ev({ id: 'b', competency_id: 'PRJ', points: 6, weight_factors: { role: 'chairperson', level: 'national' }, event_date: NOW }),
    ev({ id: 'c', competency_id: 'FIN', points: 4, weight_factors: { level: 'university' }, event_date: NOW }),
  ], NOW);
  const top3 = scores.map((s) => s.score).sort((a, b) => b - a).slice(0, 3);
  const expected = Math.round((top3.reduce((a, b) => a + b, 0) / 3) * 10) / 10;
  assert('skor keseluruhan = purata 3 tertinggi', overallScore(scores) === expected);
  assert('tiada evidence → skor keseluruhan 0', overallScore(recalculateStudent('S9', COMPETENCY_CODES, [], NOW)) === 0);
}

// 14) Jalur prestasi mengikut sempadan yang dipapar dalam legenda.
{
  assert('90 → cemerlang', bandOf(90) === 'cemerlang');
  assert('70 → baik', bandOf(70) === 'baik');
  assert('50 → berkembang', bandOf(50) === 'berkembang');
  assert('49.9 → perlu peningkatan', bandOf(49.9) === 'perlu');
}

console.log(failures === 0 ? '\nSemua semakan Modul Bakat LULUS.' : `\n${failures} semakan GAGAL.`);
process.exit(failures === 0 ? 0 : 1);
