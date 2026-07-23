import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
  Users2,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ImportedProgramme,
  ImportedStudent,
  RowIssue,
  TEMPLATE_HEADERS,
  TEMPLATE_EXAMPLE_ROW,
  STUDENT_TEMPLATE_HEADERS,
  STUDENT_TEMPLATE_EXAMPLE_ROW,
  parseRows,
  parseStudentRows,
} from '../../services/importParser';
import {
  ImportResultRow,
  StudentImportResultRow,
  importProgrammes,
  importStudents,
  reconcileImportOrphans,
} from '../../services/importService';

type Mode = 'program' | 'pelajar';
type Stage = 'idle' | 'preview' | 'importing' | 'done';

// Import Data (Excel) — dua mod:
// 1. Program Lepas: cipta pelajar + permohonan (Lulus Sepenuhnya) + laporan
//    (Disahkan); bukti bakat dijana automatik melalui enjin derivation sebenar.
// 2. Butiran Pelajar: cipta / kemas kini rekod pelajar (padanan no. matrik).
export default function ExcelImportModule() {
  const [mode, setMode] = useState<Mode>('program');
  const [stage, setStage] = useState<Stage>('idle');
  const [fileName, setFileName] = useState('');
  const [programmes, setProgrammes] = useState<ImportedProgramme[]>([]);
  const [students, setStudents] = useState<ImportedStudent[]>([]);
  const [issues, setIssues] = useState<RowIssue[]>([]);
  const [parseError, setParseError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [programmeResults, setProgrammeResults] = useState<ImportResultRow[]>([]);
  const [studentResults, setStudentResults] = useState<StudentImportResultRow[]>([]);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMsg, setReconcileMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pulihkan baris import yang yatim (permohonan import tanpa laporan —
  // akibat kegagalan separa import terdahulu): lengkapkan laporan + bukti.
  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileMsg('');
    try {
      const r = await reconcileImportOrphans();
      if (r.checked === 0) {
        setReconcileMsg('Tiada rekod import yatim ditemui.');
      } else {
        const failNote =
          r.failures.length > 0
            ? ` (${r.failures.length} gagal: ${r.failures[0].appId} — ${r.failures[0].message})`
            : '';
        setReconcileMsg(`${r.fixed} daripada ${r.checked} rekod import dipulihkan.${failNote}`);
      }
    } catch (err) {
      setReconcileMsg(
        err instanceof Error ? `Pemulihan gagal: ${err.message}` : 'Pemulihan gagal.',
      );
    } finally {
      setReconciling(false);
    }
  };

  const reset = () => {
    setStage('idle');
    setFileName('');
    setProgrammes([]);
    setStudents([]);
    setIssues([]);
    setProgrammeResults([]);
    setStudentResults([]);
    setParseError('');
    setProgress({ done: 0, total: 0 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    reset();
  };

  const handleDownloadTemplate = () => {
    const headers = mode === 'program' ? [...TEMPLATE_HEADERS] : [...STUDENT_TEMPLATE_HEADERS];
    const example = mode === 'program' ? TEMPLATE_EXAMPLE_ROW : STUDENT_TEMPLATE_EXAMPLE_ROW;
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(String(h).length + 2, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, mode === 'program' ? 'Program' : 'Pelajar');
    XLSX.writeFile(
      wb,
      mode === 'program' ? 'templat-import-program.xlsx' : 'templat-import-pelajar.xlsx',
    );
  };

  const handleFile = async (file: File) => {
    setParseError('');
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) throw new Error('Fail tidak mengandungi sebarang helaian.');
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (mode === 'program') {
        const parsed = parseRows(rows);
        setProgrammes(parsed.programmes);
        setIssues(parsed.issues);
      } else {
        const parsed = parseStudentRows(rows);
        setStudents(parsed.students);
        setIssues(parsed.issues);
      }
      setStage('preview');
    } catch (err) {
      console.error('Error parsing Excel:', err);
      setParseError(err instanceof Error ? err.message : 'Fail tidak dapat dibaca.');
      setStage('idle');
    }
  };

  const handleImport = async () => {
    setStage('importing');
    const total = mode === 'program' ? programmes.length : students.length;
    setProgress({ done: 0, total });
    try {
      if (mode === 'program') {
        const res = await importProgrammes(programmes, (done, t) =>
          setProgress({ done, total: t }),
        );
        setProgrammeResults(res);
      } else {
        const res = await importStudents(students, (done, t) => setProgress({ done, total: t }));
        setStudentResults(res);
      }
      setStage('done');
    } catch (err) {
      console.error('Error importing:', err);
      setParseError(err instanceof Error ? err.message : 'Import gagal.');
      setStage('preview');
    }
  };

  const errors = issues.filter((i) => i.severity === 'ralat');
  const warnings = issues.filter((i) => i.severity === 'amaran');
  const validCount = mode === 'program' ? programmes.length : students.length;

  const created = programmeResults.filter((r) => r.status === 'dicipta');
  const skipped = programmeResults.filter((r) => r.status === 'dilangkau');
  const failedProg = programmeResults.filter((r) => r.status === 'ralat');
  const totalBukti = programmeResults.reduce((a, r) => a + r.buktiCreated, 0);

  const sCreated = studentResults.filter((r) => r.status === 'dicipta');
  const sUpdated = studentResults.filter((r) => r.status === 'dikemas kini');
  const sFailed = studentResults.filter((r) => r.status === 'ralat');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" /> Import Data (Excel)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Masukkan data secara pukal tanpa kemasukan manual — pilih jenis data di bawah, muat
            turun templat, isi dan muat naik.
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          <div className="flex gap-2">
            {mode === 'program' && (
              <button
                onClick={handleReconcile}
                disabled={reconciling}
                title="Lengkapkan semula rekod import yang tergantung (permohonan tanpa laporan)"
                className="flex items-center gap-2 border border-amber-300 text-amber-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                {reconciling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                Pulihkan Import
              </button>
            )}
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 border border-slate-300 text-slate-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" /> Muat Turun Templat
            </button>
          </div>
          {reconcileMsg && <p className="text-xs text-slate-600">{reconcileMsg}</p>}
        </div>
      </div>

      {/* Pemilih jenis import */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => switchMode('program')}
          className={`text-left rounded-2xl border-2 p-4 transition-colors ${
            mode === 'program'
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <p className="font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet
              className={`w-4 h-4 ${mode === 'program' ? 'text-blue-600' : 'text-slate-400'}`}
            />
            Program Lepas
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Satu baris = satu program selesai. Cipta permohonan (Lulus Sepenuhnya) + laporan
            (Disahkan); bukti bakat dijana automatik.
          </p>
        </button>
        <button
          onClick={() => switchMode('pelajar')}
          className={`text-left rounded-2xl border-2 p-4 transition-colors ${
            mode === 'pelajar'
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <p className="font-bold text-slate-900 flex items-center gap-2">
            <Users2
              className={`w-4 h-4 ${mode === 'pelajar' ? 'text-blue-600' : 'text-slate-400'}`}
            />
            Butiran Pelajar
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Satu baris = satu pelajar (nama, matrik, fakulti, kolej, tahun, program pengajian,
            telefon, alamat). Pelajar sedia ada dikemas kini melalui padanan no. matrik.
          </p>
        </button>
      </div>

      {parseError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          {parseError}
        </div>
      )}

      {stage === 'idle' && (
        <label className="block bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-300 p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="font-display text-lg font-bold text-slate-900">
            Pilih fail Excel {mode === 'program' ? 'program lepas' : 'butiran pelajar'} (.xlsx)
          </p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Gunakan templat di atas untuk format lajur yang betul. Fail .xls dan .csv juga disokong.
          </p>
        </label>
      )}

      {stage === 'preview' && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Pratonton: {fileName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {validCount} {mode === 'program' ? 'program' : 'pelajar'} sah dikesan
                  {errors.length > 0 && ` · ${errors.length} ralat (baris terlibat dilangkau)`}
                  {warnings.length > 0 && ` · ${warnings.length} amaran`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleImport}
                  disabled={validCount === 0}
                  className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" /> Import {validCount}{' '}
                  {mode === 'program' ? 'Program' : 'Pelajar'}
                </button>
              </div>
            </div>

            {issues.length > 0 && (
              <div className="mb-4 space-y-1.5 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                {issues.map((issue, i) => (
                  <p
                    key={i}
                    className={`text-xs flex items-start gap-1.5 ${issue.severity === 'ralat' ? 'text-red-700' : 'text-amber-700'}`}
                  >
                    {issue.severity === 'ralat' ? (
                      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    )}
                    <span>
                      <span className="font-semibold">Baris {issue.row}:</span> {issue.message}
                    </span>
                  </p>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              {mode === 'program' ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 font-semibold">Pelajar</th>
                      <th className="py-2 pr-3 font-semibold">Jawatan</th>
                      <th className="py-2 pr-3 font-semibold">Program</th>
                      <th className="py-2 pr-3 font-semibold">Kategori · Peringkat</th>
                      <th className="py-2 pr-3 font-semibold">Tarikh</th>
                      <th className="py-2 font-semibold text-right">Bajet Disahkan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programmes.map((p, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-slate-900">{p.student.name}</p>
                          <p className="text-xs text-slate-500">{p.student.matric}</p>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-700">{p.jawatan}</td>
                        <td className="py-2.5 pr-3 text-slate-700">{p.title}</td>
                        <td className="py-2.5 pr-3 text-slate-500 text-xs">
                          {p.kategori} · {p.peringkat}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-slate-500 text-xs">
                          {p.startDate}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-slate-700">
                          {p.budgetVerified ? `RM${p.budgetVerified.toLocaleString('ms-MY')}` : '—'}
                        </td>
                      </tr>
                    ))}
                    {programmes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                          Tiada baris sah — sila betulkan ralat di atas dan muat naik semula.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                      <th className="py-2 pr-3 font-semibold">Pelajar</th>
                      <th className="py-2 pr-3 font-semibold">Fakulti · Kolej</th>
                      <th className="py-2 pr-3 font-semibold">Tahun</th>
                      <th className="py-2 pr-3 font-semibold">Program Pengajian</th>
                      <th className="py-2 font-semibold">Telefon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, i) => (
                      <tr key={i} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-500">
                            {s.matric}
                            {s.email ? ` · ${s.email}` : ''}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600 text-xs">
                          {[s.faculty, s.college].filter(Boolean).join(' · ') || '—'}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-slate-700">
                          {s.studyYear ?? '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600 text-xs">{s.programme ?? '—'}</td>
                        <td className="py-2.5 text-slate-600 text-xs">{s.phone ?? '—'}</td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                          Tiada baris sah — sila betulkan ralat di atas dan muat naik semula.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            {mode === 'program' ? (
              <span>
                Setiap program akan dicipta sebagai permohonan <b>Lulus Sepenuhnya</b> dengan
                laporan <b>Disahkan</b>, dan bukti bakat pelajar dijana serta-merta. Program yang
                sudah wujud (matrik + tajuk + tarikh sama) akan dilangkau — selamat diimport
                berulang kali.
              </span>
            ) : (
              <span>
                Pelajar dipadankan melalui <b>no. matrik</b>: yang sedia ada akan{' '}
                <b>dikemas kini</b> (hanya medan yang diisi dalam Excel), yang baharu akan{' '}
                <b>dicipta</b>. Selamat diimport berulang kali.
              </span>
            )}
          </div>
        </>
      )}

      {stage === 'importing' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="font-display text-lg font-bold text-slate-900">
            Mengimport {mode === 'program' ? 'program' : 'pelajar'} {progress.done}/{progress.total}
            ...
          </p>
          <div className="max-w-sm mx-auto mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {stage === 'done' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold text-slate-900">Import Selesai</h3>
            <button
              onClick={reset}
              className="border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Import Fail Lain
            </button>
          </div>

          {mode === 'program' ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <ResultStat
                  value={created.length}
                  label="Program dicipta"
                  cls="border-emerald-200 bg-emerald-50 text-emerald-700"
                />
                <ResultStat
                  value={totalBukti}
                  label="Bukti bakat dijana"
                  cls="border-indigo-200 bg-indigo-50 text-indigo-700"
                />
                <ResultStat
                  value={skipped.length}
                  label="Dilangkau (sudah wujud)"
                  cls="border-slate-200 bg-slate-50 text-slate-600"
                />
                <ResultStat
                  value={failedProg.length}
                  label="Gagal"
                  cls="border-red-200 bg-red-50 text-red-700"
                />
              </div>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {programmeResults.map((r, i) => (
                  <ResultRow
                    key={i}
                    ok={r.status === 'dicipta'}
                    neutral={r.status === 'dilangkau'}
                    title={r.programme.title}
                    subtitle={r.programme.student.name}
                    detail={
                      r.status === 'dicipta' ? `${r.detail} · ${r.buktiCreated} bukti` : r.detail
                    }
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <ResultStat
                  value={sCreated.length}
                  label="Pelajar dicipta"
                  cls="border-emerald-200 bg-emerald-50 text-emerald-700"
                />
                <ResultStat
                  value={sUpdated.length}
                  label="Dikemas kini"
                  cls="border-blue-200 bg-blue-50 text-blue-700"
                />
                <ResultStat
                  value={sFailed.length}
                  label="Gagal"
                  cls="border-red-200 bg-red-50 text-red-700"
                />
              </div>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {studentResults.map((r, i) => (
                  <ResultRow
                    key={i}
                    ok={r.status === 'dicipta'}
                    neutral={r.status === 'dikemas kini'}
                    title={r.student.name}
                    subtitle={r.student.matric}
                    detail={r.status === 'ralat' ? r.detail : r.status}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ResultStat({ value, label, cls }: { value: number; label: string; cls: string }) {
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <p className="text-2xl font-bold font-display tabular-nums">{value}</p>
      <p className="text-xs font-semibold">{label}</p>
    </div>
  );
}

function ResultRow({
  ok,
  neutral,
  title,
  subtitle,
  detail,
}: {
  ok: boolean;
  neutral: boolean;
  title: string;
  subtitle: string;
  detail: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
      ) : neutral ? (
        <Info className="w-4 h-4 text-blue-500 shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
      )}
      <span className="font-medium text-slate-900">{title}</span>
      <span className="text-xs text-slate-500">({subtitle})</span>
      <span className="ml-auto text-xs text-slate-500">{detail}</span>
    </div>
  );
}
