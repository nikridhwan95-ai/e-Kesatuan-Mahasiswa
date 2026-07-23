// Semakan sifat Modul Bakat (enjin skor + derivation e-Kesatuan → evidence).
// Dijalankan dengan: npm run check:bakat
// Mengesahkan IRON RULE & sifat matematik enjin tanpa kerangka ujian berat.

import {
  attendanceFactor,
  COMPETENCY_CODES,
  recalculateStudent,
  recencyDecay,
  scoreBreakdown,
  Evidence,
} from '../src/bakat/domain';
import { deriveEvidence, qualifiesForEvidence, LEVEL_MAP, ROLE_MAP } from '../src/bakat/derive';
import { bandOf, computeCohortStats, overallScore } from '../src/bakat/insights';
import {
  normalizeDate,
  parseRows,
  parseStudentRows,
  dedupeKey,
  ImportedProgramme,
} from '../src/services/importParser';
import { planProgrammeImport, sessionPrefix } from '../src/services/importPlan';
import { Application, Report, User } from '../src/types';

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
  assert(
    'evidence pending tidak menyumbang',
    scoreBreakdown('S1', 'LEA', withPending, NOW).score === s0,
  );
  assert('evidence void tidak menyumbang', scoreBreakdown('S1', 'LEA', withVoid, NOW).score === s0);
  assert(
    'evidence disputed tidak menyumbang',
    scoreBreakdown('S1', 'LEA', withDisputed, NOW).score === s0,
  );
}

// 2) Monotonik: menambah evidence 'approved' tidak menurunkan skor.
{
  const a = [ev({ id: 'e1', points: 4 })];
  const b = [...a, ev({ id: 'e2', points: 4, source_type: 'certificate' })];
  assert(
    'menambah evidence approved tidak menurunkan skor',
    scoreBreakdown('S1', 'LEA', b, NOW).score >= scoreBreakdown('S1', 'LEA', a, NOW).score,
  );
}

// 3) Cap pada 100.
{
  const many = Array.from({ length: 40 }, (_, i) =>
    ev({
      id: `e${i}`,
      points: 10,
      source_type: 'achievement',
      weight_factors: { level: 'international', role: 'chairperson' },
    }),
  );
  assert('skor dihadkan pada 100', scoreBreakdown('S1', 'LEA', many, NOW).score <= 100);
}

// 4) Decay: evidence lama menyumbang kurang daripada yang baharu (points sama).
{
  const recent = [ev({ id: 'r', points: 6, event_date: '2026-06-01T00:00:00.000Z' })];
  const old = [ev({ id: 'o', points: 6, event_date: '2022-06-01T00:00:00.000Z' })];
  assert(
    'recency decay mengurangkan evidence lama',
    scoreBreakdown('S1', 'LEA', recent, NOW).score > scoreBreakdown('S1', 'LEA', old, NOW).score,
  );
}

// 5) Jumlah sumbangan berkesan == skor paksi (tepat) — kriteria drill-down.
{
  const mixed = [
    ev({
      id: 'a',
      points: 8,
      source_type: 'committee_role',
      weight_factors: { role: 'chairperson', level: 'national', attendance_pct: 90 },
    }),
    ev({
      id: 'b',
      points: 5,
      source_type: 'participation',
      weight_factors: { role: 'participant', level: 'university', attendance_pct: 100 },
    }),
    ev({
      id: 'c',
      points: 7,
      source_type: 'competition_result',
      weight_factors: { level: 'international' },
    }),
  ];
  const bd = scoreBreakdown('S1', 'LEA', mixed, NOW);
  const sum = Math.round(bd.contributions.reduce((a, c) => a + c.effective, 0) * 10) / 10;
  assert('jumlah sumbangan dipapar == skor paksi', sum === bd.score);
}

// 6) Pendarab peranan & peringkat meningkatkan sumbangan.
{
  const low = [
    ev({ id: 'l', points: 5, weight_factors: { role: 'participant', level: 'faculty' } }),
  ];
  const high = [
    ev({ id: 'h', points: 5, weight_factors: { role: 'chairperson', level: 'international' } }),
  ];
  assert(
    'peranan+peringkat lebih tinggi = sumbangan lebih tinggi',
    scoreBreakdown('S1', 'LEA', high, NOW).score > scoreBreakdown('S1', 'LEA', low, NOW).score,
  );
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
  assert(
    'permohonan belum lulus tidak layak',
    deriveEvidence(app({ status: 'Menunggu Semakan' }), report()).length === 0,
  );
  assert(
    'laporan belum disahkan tidak layak',
    deriveEvidence(app(), report({ status: 'Dihantar' })).length === 0,
  );
  assert('tiada laporan tidak layak', deriveEvidence(app(), undefined).length === 0);
}

// 9) Evidence terbitan: status approved, ID deterministik (idempotent).
{
  const rows1 = deriveEvidence(app(), report());
  const rows2 = deriveEvidence(app(), report());
  assert('sekurang-kurangnya LEA+PRJ+FIN+kategori dijana', rows1.length >= 4);
  assert(
    'semua evidence terbitan berstatus approved',
    rows1.every((e) => e.status === 'approved'),
  );
  assert(
    'ID deterministik — jana semula memberi ID sama',
    rows1.map((e) => e.id).join() === rows2.map((e) => e.id).join(),
  );
  assert('ID unik dalam satu program', new Set(rows1.map((e) => e.id)).size === rows1.length);
  assert(
    'student_id = applicantId',
    rows1.every((e) => e.student_id === 'UID1'),
  );
  assert(
    'source_id = applications.id',
    rows1.every((e) => e.source_id === 'KM.25-26.001'),
  );
}

// 10) Pemetaan peranan & peringkat betul.
{
  const rows = deriveEvidence(app(), report());
  const lea = rows.find((e) => e.competency_id === 'LEA' && e.source_type === 'committee_role')!;
  assert('Pengarah → chairperson', lea.weight_factors.role === 'chairperson');
  assert('Universiti → university', lea.weight_factors.level === 'university');
  const sec = deriveEvidence(app({ applicantPosition: 'Setiausaha' }), report()).find(
    (e) => e.competency_id === 'LEA',
  )!;
  assert('Setiausaha → secretary', sec.weight_factors.role === 'secretary');
  assert(
    'semua peringkat e-Kesatuan dipetakan',
    ['Antarabangsa', 'Kebangsaan', 'Negeri', 'Universiti', 'Kolej atau Fakulti'].every(
      (l) => LEVEL_MAP[l] !== undefined,
    ),
  );
  assert(
    'semua jawatan pemohon dipetakan',
    ['Pengarah', 'Setiausaha'].every((r) => ROLE_MAP[r] !== undefined),
  );
}

// 11) Dedupe: kategori & kemahiran insaniah yang jatuh pada kompetensi sama
//     tidak menjana dua rekod achievement untuk kompetensi itu.
{
  const rows = deriveEvidence(
    app({ category: 'Keusahawanan', softSkills: ['Kemahiran Keusahawanan'] }),
    report(),
  );
  const entAchievements = rows.filter(
    (e) => e.competency_id === 'ENT' && e.source_type === 'achievement',
  );
  assert('tiada rekod berganda kompetensi sama', entAchievements.length === 1);
}

// 12) Kategori Sukan menjana evidence SPO; kemahiran insaniah dipetakan.
{
  const rows = deriveEvidence(app(), report());
  assert(
    'kategori Sukan → SPO',
    rows.some((e) => e.competency_id === 'SPO'),
  );
  assert(
    'Kemahiran Kerja Berpasukan → NET',
    rows.some((e) => e.competency_id === 'NET'),
  );
  assert(
    'bajet disahkan → FIN',
    rows.some((e) => e.competency_id === 'FIN'),
  );
}

console.log('\nSkor keseluruhan & jalur:');

// 13) Skor keseluruhan = purata 3 skor tertinggi; 0 tanpa evidence.
{
  const scores = recalculateStudent(
    'S1',
    COMPETENCY_CODES,
    [
      ev({
        id: 'a',
        competency_id: 'LEA',
        points: 8,
        weight_factors: { role: 'chairperson', level: 'national' },
        event_date: NOW,
      }),
      ev({
        id: 'b',
        competency_id: 'PRJ',
        points: 6,
        weight_factors: { role: 'chairperson', level: 'national' },
        event_date: NOW,
      }),
      ev({
        id: 'c',
        competency_id: 'FIN',
        points: 4,
        weight_factors: { level: 'university' },
        event_date: NOW,
      }),
    ],
    NOW,
  );
  const top3 = scores
    .map((s) => s.score)
    .sort((a, b) => b - a)
    .slice(0, 3);
  const expected = Math.round((top3.reduce((a, b) => a + b, 0) / 3) * 10) / 10;
  assert('skor keseluruhan = purata 3 tertinggi', overallScore(scores) === expected);
  assert(
    'tiada evidence → skor keseluruhan 0',
    overallScore(recalculateStudent('S9', COMPETENCY_CODES, [], NOW)) === 0,
  );
}

// 14) Jalur prestasi mengikut sempadan yang dipapar dalam legenda.
{
  assert('90 → cemerlang', bandOf(90) === 'cemerlang');
  assert('70 → baik', bandOf(70) === 'baik');
  assert('50 → berkembang', bandOf(50) === 'berkembang');
  assert('49.9 → perlu peningkatan', bandOf(49.9) === 'perlu');
}

console.log('\nParser Import Excel:');

// 15) Baris sah menghasilkan satu program tanpa ralat.
{
  const baris = {
    'Nama Pelajar': 'Sarah binti Ahmad',
    'No. Matrik': 'a210001',
    Jawatan: 'Pengarah',
    'Tajuk Program': 'Festival Zapin',
    Kategori: 'Kebudayaan',
    Peringkat: 'Kebangsaan',
    'Tarikh Mula': '01/04/2026',
    'Tarikh Tamat': '03/04/2026',
    'Bajet Diluluskan (RM)': 8000,
    'Bajet Disahkan (RM)': '6,800',
    'Bilangan Peserta': 320,
    'Kemahiran Insaniah': 'Kemahiran Kepimpinan; Skil Tidak Wujud',
    Objektif: 'demo',
  };
  const { programmes, issues } = parseRows([baris]);
  assert('baris sah → 1 program', programmes.length === 1);
  assert(
    'tiada ralat pada baris sah',
    issues.every((i) => i.severity !== 'ralat'),
  );
  assert('matrik dinormalkan ke huruf besar', programmes[0]?.student.matric === 'A210001');
  assert('tarikh hh/bb/tttt dinormalkan', programmes[0]?.startDate === '2026-04-01');
  assert('bajet dengan koma dibaca', programmes[0]?.budgetVerified === 6800);
  assert(
    'kemahiran tidak dikenali dilangkau dengan amaran',
    programmes[0]?.softSkills.length === 1 && issues.some((i) => i.severity === 'amaran'),
  );
}

// 16) Baris tidak sah dilangkau dengan ralat.
{
  const { programmes, issues } = parseRows([
    {
      'Nama Pelajar': 'X',
      Jawatan: 'Pengarah',
      'Tajuk Program': 'Y',
      Peringkat: 'Universiti',
      'Tarikh Mula': '01/01/2026',
    }, // tiada matrik
    {
      'Nama Pelajar': 'X',
      'No. Matrik': 'A1',
      Jawatan: 'Peserta',
      'Tajuk Program': 'Y',
      Peringkat: 'Universiti',
      'Tarikh Mula': '01/01/2026',
    }, // jawatan salah
    {
      'Nama Pelajar': 'X',
      'No. Matrik': 'A2',
      Jawatan: 'Pengarah',
      'Tajuk Program': 'Y',
      Peringkat: 'Daerah',
      'Tarikh Mula': '01/01/2026',
    }, // peringkat salah
  ]);
  assert('baris tidak sah tidak menghasilkan program', programmes.length === 0);
  assert(
    'setiap baris tidak sah ada ralat',
    issues.filter((i) => i.severity === 'ralat').length >= 3,
  );
}

// 17) Normalisasi tarikh: nombor siri Excel & ISO.
{
  assert('nombor siri Excel dinormalkan', normalizeDate(46113) === '2026-04-01');
  assert('tarikh ISO diterima', normalizeDate('2026-04-01') === '2026-04-01');
  assert('tarikh kosong → null', normalizeDate('') === null);
}

// 18) Kunci penduaan tidak sensitif huruf.
{
  assert(
    'kunci penduaan konsisten',
    dedupeKey('a210001', 'Festival Zapin', '2026-04-01') ===
      dedupeKey('A210001', 'festival zapin', '2026-04-01'),
  );
}

console.log('\nParser Import Butiran Pelajar:');

// 19) Baris pelajar sah + medan pilihan dipetakan.
{
  const { students, issues } = parseStudentRows([
    {
      'Nama Pelajar': 'Sarah binti Ahmad',
      'No. Matrik': 'a210001',
      'E-mel': 'sarah@siswa.upm.edu.my',
      Fakulti: 'Fakulti Kejuruteraan',
      Kolej: 'Kolej Canselor',
      Tahun: 3,
      'Program Pengajian': 'Ijazah Sarjana Muda Kejuruteraan Mekanikal',
      'No. Telefon': '+60 11-1234 5678',
      Alamat: 'Seri Kembangan, Selangor',
    },
  ]);
  assert('baris pelajar sah → 1 pelajar', students.length === 1 && issues.length === 0);
  assert('matrik pelajar dinormalkan', students[0]?.matric === 'A210001');
  assert(
    'tahun & alamat dipetakan',
    students[0]?.studyYear === '3' && students[0]?.address === 'Seri Kembangan, Selangor',
  );
  assert('telefon dipetakan', students[0]?.phone === '+60 11-1234 5678');
}

// 20) Baris tanpa matrik dilangkau; matrik berulang dalam fail dilangkau dengan amaran.
{
  const { students, issues } = parseStudentRows([
    { 'Nama Pelajar': 'X' }, // tiada matrik
    { 'Nama Pelajar': 'Y', 'No. Matrik': 'A1' },
    { 'Nama Pelajar': 'Y2', 'No. Matrik': 'a1' }, // berulang (huruf kecil)
  ]);
  assert('hanya baris sah diterima', students.length === 1);
  assert(
    'tiada matrik → ralat',
    issues.some((i) => i.severity === 'ralat'),
  );
  assert(
    'matrik berulang → amaran',
    issues.some((i) => i.severity === 'amaran' && i.message.includes('berulang')),
  );
}

console.log('\nPengawal ketahanan enjin (input tidak sah):');

// 21) Faktor decay dan kehadiran sentiasa dalam julat; input rosak → neutral 1.
{
  assert('decay tarikh tidak sah → faktor neutral 1', recencyDecay('bukan-tarikh', NOW) === 1);
  assert('decay "sekarang" tidak sah → faktor neutral 1', recencyDecay(NOW, 'rosak') === 1);
  assert('decay masa depan → 1 (tiada boost)', recencyDecay('2027-01-01T00:00:00.000Z', NOW) === 1);
  const past = recencyDecay('2024-07-16T00:00:00.000Z', NOW);
  assert('decay dalam julat (0,1]', past > 0 && past <= 1);
  assert('attendanceFactor NaN → 1', attendanceFactor(NaN) === 1);
  assert(
    'attendanceFactor dalam julat 0.5–1',
    attendanceFactor(0) === 0.5 && attendanceFactor(100) === 1,
  );
  assert(
    'attendanceFactor diklamp luar julat',
    attendanceFactor(-50) === 0.5 && attendanceFactor(150) === 1,
  );
}

// 22) Satu baris bukti bertarikh rosak TIDAK meracuni skor paksi (regresi NaN).
{
  const rows = [
    ev({ id: 'ok', points: 6, event_date: NOW }),
    ev({ id: 'rosak', points: 6, event_date: 'tarikh-rosak' }),
  ];
  const s = scoreBreakdown('S1', 'LEA', rows, NOW).score;
  assert('bukti bertarikh rosak tidak menghasilkan NaN', Number.isFinite(s));
  assert('bukti bertarikh rosak menyumbang secara neutral', s === 12);
}

// 23) points diklamp pada julat terdokumen 0–10.
{
  const capped = scoreBreakdown(
    'S1',
    'LEA',
    [ev({ id: 'x', points: 100, event_date: NOW })],
    NOW,
  ).score;
  const ten = scoreBreakdown(
    'S1',
    'LEA',
    [ev({ id: 'y', points: 10, event_date: NOW })],
    NOW,
  ).score;
  assert('points > 10 diklamp kepada 10', capped === ten);
  const neg = scoreBreakdown(
    'S1',
    'LEA',
    [ev({ id: 'z', points: -5, event_date: NOW })],
    NOW,
  ).score;
  assert('points negatif → sumbangan 0', neg === 0);
  const nan = scoreBreakdown(
    'S1',
    'LEA',
    [ev({ id: 'n', points: NaN, event_date: NOW })],
    NOW,
  ).score;
  assert('points NaN → sumbangan 0', nan === 0);
}

// 24) Cap per-sumber: kumpulan yang melebihi cap diskalakan tepat kepada cap.
{
  // participation cap = 25; 5 × 10 mata = 50 mentah → skala 0.5 → 5.0 setiap satu.
  const rows = Array.from({ length: 5 }, (_, i) =>
    ev({
      id: `p${i}`,
      source_type: 'participation',
      points: 10,
      weight_factors: {},
      event_date: NOW,
    }),
  );
  const b = scoreBreakdown('S1', 'LEA', rows, NOW);
  assert('cap per-sumber: jumlah kumpulan == cap apabila melebihi', b.score === 25);
  assert('cap per-sumber: bendera capped benar', b.capped === true);
  assert(
    'identiti jumlah: skor == Σ sumbangan selepas cap',
    b.score === Math.round(b.contributions.reduce((a, c) => a + c.effective, 0) * 10) / 10,
  );
}

// 25) Cap keseluruhan 100 dengan skala berkadar merentas sumber.
{
  const rows = [
    ...Array.from({ length: 8 }, (_, i) =>
      ev({
        id: `c${i}`,
        source_type: 'committee_role',
        points: 10,
        weight_factors: {},
        event_date: NOW,
      }),
    ),
    ...Array.from({ length: 5 }, (_, i) =>
      ev({
        id: `a${i}`,
        source_type: 'achievement',
        points: 10,
        weight_factors: {},
        event_date: NOW,
      }),
    ),
    ...Array.from({ length: 5 }, (_, i) =>
      ev({
        id: `q${i}`,
        source_type: 'participation',
        points: 10,
        weight_factors: {},
        event_date: NOW,
      }),
    ),
  ];
  const b = scoreBreakdown('S1', 'LEA', rows, NOW);
  assert('cap keseluruhan: skor tepat 100', b.score === 100);
  assert('cap keseluruhan: bendera capped benar', b.capped === true);
}

console.log('\nSkor keseluruhan (profil sempit) & sempadan jalur:');

// 26) overallScore TIDAK memenuhkan sifar: profil sempit tidak dihukum.
{
  const one = [{ score: 90 }, ...Array.from({ length: 15 }, () => ({ score: 0 }))].map((s, i) => ({
    student_id: 'S1',
    competency_id: COMPETENCY_CODES[i],
    score: s.score,
    evidence_count: s.score > 0 ? 1 : 0,
    last_evidence_at: null,
    engine_version: 'x',
  }));
  assert('overallScore 1 kompetensi @90 → 90', overallScore(one) === 90);
  const two = one.map((s, i) => (i === 1 ? { ...s, score: 80 } : s));
  assert('overallScore 2 kompetensi (90, 80) → 85', overallScore(two) === 85);
  assert('overallScore tiada bukti → 0', overallScore(one.map((s) => ({ ...s, score: 0 }))) === 0);
}

// 27) Sempadan atas jalur (bandOf) — nilai .9 kekal dalam jalur bawah.
{
  assert('89.9 → baik', bandOf(89.9) === 'baik');
  assert('69.9 → berkembang', bandOf(69.9) === 'berkembang');
}

// 28) computeCohortStats deterministik dengan asOf tetap.
{
  const users: User[] = [
    {
      uid: 'M-A1',
      email: 'a1@x',
      role: 'student',
      name: 'A',
      createdAt: NOW,
    },
  ];
  const evi = [
    ev({ id: 'e1', student_id: 'M-A1', points: 8, event_date: '2025-01-01T00:00:00.000Z' }),
  ];
  const s1 = computeCohortStats(users, evi, NOW);
  const s2 = computeCohortStats(users, evi, NOW);
  assert(
    'computeCohortStats deterministik dengan asOf tetap',
    JSON.stringify(s1) === JSON.stringify(s2),
  );
}

console.log('\nPengesahan tarikh import & perancang import:');

// 29) normalizeDate menolak komponen tarikh mustahil.
{
  assert('normalizeDate menolak bulan > 12', normalizeDate('25/13/2026') === null);
  assert('normalizeDate menolak hari > 31', normalizeDate('32/01/2026') === null);
  assert('normalizeDate menolak 31 Feb (ISO)', normalizeDate('2026-02-31') === null);
  assert('normalizeDate dd/mm ditafsir betul', normalizeDate('03/04/2026') === '2026-04-03');
}

// 30) deriveEvidence tidak melempar walaupun semua tarikh rosak (fungsi total).
{
  const appRosak = app({
    startDate: 'invalid',
    endDate: '',
    createdAt: 'also-bad',
    updatedAt: '',
  });
  let threw = false;
  let rows: Evidence[] = [];
  try {
    rows = deriveEvidence(appRosak, report({ reviewedAt: 'turut-rosak' }));
  } catch {
    threw = true;
  }
  assert('deriveEvidence tidak melempar untuk tarikh rosak', !threw && rows.length > 0);
  assert(
    'tarikh rosak → penanda epok deterministik',
    rows.every((r) => r.event_date === '1970-01-01T00:00:00.000Z'),
  );
}

// 31) Perancang import: penduaan, padanan M-<matrik>, turutan ID, pelajar baharu.
{
  const prog = (matric: string, title: string, startDate: string): ImportedProgramme => ({
    student: { name: 'X', matric },
    jawatan: 'Pengarah',
    title,
    kategori: 'Sukan',
    peringkat: 'Universiti',
    startDate,
    endDate: startDate,
    budgetApproved: 1000,
    budgetVerified: 900,
    participants: 50,
    softSkills: [],
    objektif: '',
  });

  // Regresi pepijat kunci penduaan: permohonan sedia ada dengan pemohon
  // M-A123 yang TIADA dalam senarai pengguna mesti tetap sepadan dengan
  // baris Excel bermatrik A123.
  const plan1 = planProgrammeImport(
    [prog('A123', 'Program X', '2026-03-01')],
    [],
    [{ id: 'KM.25-26.001', applicantId: 'M-A123', title: 'Program X', startDate: '2026-03-01' }],
  );
  assert(
    'plan import: kunci penduaan konsisten untuk uid M-<matrik>',
    plan1[0].action === 'langkau',
  );

  // Baris kembar dalam fail yang sama → kedua dilangkau.
  const plan2 = planProgrammeImport(
    [prog('A200', 'Program Y', '2026-04-01'), prog('A200', 'Program Y', '2026-04-01')],
    [],
    [],
  );
  assert(
    'plan import: baris kembar dalam fail dilangkau',
    plan2[0].action === 'cipta' && plan2[1].action === 'langkau',
  );

  // Turutan ID menyambung daripada permohonan sedia ada dalam sesi yang sama.
  const plan3 = planProgrammeImport(
    [prog('A300', 'Program Z', '2026-03-01')],
    [],
    [{ id: 'KM.25-26.007', applicantId: 'U1', title: 'Lain', startDate: '2026-01-01' }],
  );
  assert('plan import: turutan ID menyambung (008)', plan3[0].appId === 'KM.25-26.008');
  assert(
    'plan import: awalan sesi ikut tarikh program',
    sessionPrefix('2026-03-01') === 'KM.25-26.',
  );

  // Pelajar baharu yang sama dalam satu kelompok: cipta SEKALI sahaja.
  const plan4 = planProgrammeImport(
    [prog('A400', 'P1', '2026-03-01'), prog('A400', 'P2', '2026-03-02')],
    [],
    [],
  );
  assert(
    'plan import: pelajar baharu dicipta sekali untuk kelompok',
    plan4[0].createUser === true && plan4[1].createUser === false && plan4[0].uid === plan4[1].uid,
  );
}

console.log(failures === 0 ? '\nSemua semakan Modul Bakat LULUS.' : `\n${failures} semakan GAGAL.`);
process.exit(failures === 0 ? 0 : 1);
