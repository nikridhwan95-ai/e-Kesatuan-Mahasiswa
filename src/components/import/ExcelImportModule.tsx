import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ImportedProgramme,
  RowIssue,
  TEMPLATE_HEADERS,
  TEMPLATE_EXAMPLE_ROW,
  parseRows,
} from '../../services/importParser';
import { ImportResultRow, importProgrammes } from '../../services/importService';

type Stage = 'idle' | 'preview' | 'importing' | 'done';

// Import Excel — muat naik senarai program lepas dan sistem mencipta rekod
// pelajar, permohonan (Lulus Sepenuhnya), laporan (Disahkan) dan bukti bakat
// secara automatik melalui enjin derivation sebenar.
export default function ExcelImportModule() {
  const [stage, setStage] = useState<Stage>('idle');
  const [fileName, setFileName] = useState('');
  const [programmes, setProgrammes] = useState<ImportedProgramme[]>([]);
  const [issues, setIssues] = useState<RowIssue[]>([]);
  const [parseError, setParseError] = useState('');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<ImportResultRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS], TEMPLATE_EXAMPLE_ROW]);
    ws['!cols'] = TEMPLATE_HEADERS.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Program');
    XLSX.writeFile(wb, 'templat-import-program.xlsx');
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
      const parsed = parseRows(rows);
      setProgrammes(parsed.programmes);
      setIssues(parsed.issues);
      setStage('preview');
    } catch (err) {
      console.error('Error parsing Excel:', err);
      setParseError(err instanceof Error ? err.message : 'Fail tidak dapat dibaca.');
      setStage('idle');
    }
  };

  const handleImport = async () => {
    setStage('importing');
    setProgress({ done: 0, total: programmes.length });
    try {
      const res = await importProgrammes(programmes, (done, total) => setProgress({ done, total }));
      setResults(res);
      setStage('done');
    } catch (err) {
      console.error('Error importing:', err);
      setParseError(err instanceof Error ? err.message : 'Import gagal.');
      setStage('preview');
    }
  };

  const reset = () => {
    setStage('idle');
    setFileName('');
    setProgrammes([]);
    setIssues([]);
    setResults([]);
    setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const errors = issues.filter((i) => i.severity === 'ralat');
  const warnings = issues.filter((i) => i.severity === 'amaran');
  const created = results.filter((r) => r.status === 'dicipta');
  const skipped = results.filter((r) => r.status === 'dilangkau');
  const failed = results.filter((r) => r.status === 'ralat');
  const totalBukti = results.reduce((a, r) => a + r.buktiCreated, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" /> Import Excel
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Muat naik senarai program lepas — sistem akan mencipta rekod pelajar, permohonan,
            laporan disahkan dan bukti bakat secara automatik.
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 border border-slate-300 text-slate-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
        >
          <Download className="w-4 h-4" /> Muat Turun Templat
        </button>
      </div>

      {parseError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          {parseError}
        </div>
      )}

      {stage === 'idle' && (
        <label className="block bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-300 p-12 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="font-display text-lg font-bold text-slate-900">Pilih fail Excel (.xlsx)</p>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Satu baris = satu program yang telah selesai. Gunakan templat di atas untuk format
            lajur yang betul. Fail .xls dan .csv juga disokong.
          </p>
        </label>
      )}

      {stage === 'preview' && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900">Pratonton: {fileName}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {programmes.length} program sah dikesan
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
                  disabled={programmes.length === 0}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" /> Import {programmes.length} Program
                </button>
              </div>
            </div>

            {issues.length > 0 && (
              <div className="mb-4 space-y-1.5 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                {issues.map((issue, i) => (
                  <p key={i} className={`text-xs flex items-start gap-1.5 ${issue.severity === 'ralat' ? 'text-red-700' : 'text-amber-700'}`}>
                    {issue.severity === 'ralat' ? (
                      <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    )}
                    <span><span className="font-semibold">Baris {issue.row}:</span> {issue.message}</span>
                  </p>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
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
                      <td className="py-2.5 pr-3 text-slate-500 text-xs">{p.kategori} · {p.peringkat}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-slate-500 text-xs">{p.startDate}</td>
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
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Setiap program akan dicipta sebagai permohonan <b>Lulus Sepenuhnya</b> dengan laporan{' '}
              <b>Disahkan</b>, dan bukti bakat pelajar dijana serta-merta. Program yang sudah wujud
              (matrik + tajuk + tarikh sama) akan dilangkau — selamat diimport berulang kali.
            </span>
          </div>
        </>
      )}

      {stage === 'importing' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="font-display text-lg font-bold text-slate-900">
            Mengimport program {progress.done}/{progress.total}...
          </p>
          <div className="max-w-sm mx-auto mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all"
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-2xl font-bold font-display tabular-nums text-emerald-700">{created.length}</p>
              <p className="text-xs font-semibold text-emerald-700">Program dicipta</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-2xl font-bold font-display tabular-nums text-indigo-700">{totalBukti}</p>
              <p className="text-xs font-semibold text-indigo-700">Bukti bakat dijana</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-2xl font-bold font-display tabular-nums text-slate-700">{skipped.length}</p>
              <p className="text-xs font-semibold text-slate-600">Dilangkau (sudah wujud)</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-2xl font-bold font-display tabular-nums text-red-700">{failed.length}</p>
              <p className="text-xs font-semibold text-red-700">Gagal</p>
            </div>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                {r.status === 'dicipta' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : r.status === 'dilangkau' ? (
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span className="font-medium text-slate-900">{r.programme.title}</span>
                <span className="text-xs text-slate-500">({r.programme.student.name})</span>
                <span className="ml-auto text-xs text-slate-500">
                  {r.status === 'dicipta'
                    ? `${r.detail} · ${r.buktiCreated} bukti`
                    : r.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
