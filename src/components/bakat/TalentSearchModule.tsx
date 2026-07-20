import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  FileCheck2,
  Gauge,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { User } from '../../types';
import { getUsers } from '../../services/dataService';
import { Evidence, competencyName } from '../../bakat/domain';
import { getAllEvidence, syncAllEvidence } from '../../bakat/evidenceService';
import {
  BAND_META,
  Band,
  computeCohortStats,
  computeSorotan,
  HIGH_POTENTIAL_THRESHOLD,
} from '../../bakat/insights';
import { Avatar, BandChip, COMPETENCY_ICON, ProgressRing, RankBadge, StatCard } from './ui';
import BakatProfile from './BakatProfile';

// Radar Bakat (Admin/HEP) — papan pemuka kecerdasan bakat merentas pelajar.
// SEMUA angka diterbitkan daripada evidence sebenar pada masa nyata.
export default function TalentSearchModule() {
  const [users, setUsers] = useState<User[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, evidenceData] = await Promise.all([getUsers(), getAllEvidence()]);
      setUsers(usersData);
      setEvidence(evidenceData);
    } catch (error) {
      console.error('Error fetching talent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncAllEvidence();
      setNotification(
        result.created > 0
          ? `Segerak selesai: ${result.created} evidence baharu dijana daripada ${result.programmes} program.`
          : 'Segerak selesai: semua evidence sudah terkini.'
      );
      setTimeout(() => setNotification(null), 5000);
      await fetchData();
    } catch (error) {
      console.error('Error syncing evidence:', error);
      setNotification('Gagal menyegerak evidence. Sila cuba lagi.');
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  const stats = useMemo(() => computeCohortStats(users, evidence), [users, evidence]);
  const sorotan = useMemo(() => computeSorotan(stats), [stats]);

  const displayedRows = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return stats.rows;
    return stats.rows.filter(({ user, strengths }) => {
      const haystack = [
        user.name,
        (user as { displayName?: string }).displayName,
        user.email,
        user.matricNumber,
        user.faculty,
        user.college,
        ...strengths.map((s) => competencyName(s.competency_id)),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [stats.rows, searchTerm]);

  const donutData = useMemo(() => {
    const bands: Band[] = ['cemerlang', 'baik', 'berkembang', 'perlu'];
    const slices = bands
      .map((b) => ({ name: BAND_META[b].label, value: stats.distribution[b], hex: BAND_META[b].hex }))
      .filter((s) => s.value > 0);
    if (stats.withoutEvidenceCount > 0) {
      slices.push({ name: 'Belum ada evidence', value: stats.withoutEvidenceCount, hex: '#cbd5e1' });
    }
    return slices;
  }, [stats]);

  if (selectedStudent) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedStudent(null)}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Radar Bakat
        </button>
        <BakatProfile
          studentId={selectedStudent.uid}
          studentName={(selectedStudent as { displayName?: string }).displayName || selectedStudent.name}
          matricNumber={selectedStudent.matricNumber}
          faculty={selectedStudent.faculty}
          college={selectedStudent.college}
          showHeader
        />
      </div>
    );
  }

  const totalStudents = stats.rows.length;

  return (
    <div className="space-y-6">
      {/* Kepala modul */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" /> Radar Bakat
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Kecerdasan bakat pelajar — setiap angka diterbitkan daripada evidence program e-Kesatuan yang disahkan.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Segerak Evidence
        </button>
      </div>

      {notification && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-xl text-sm font-medium">
          {notification}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {/* Kad statistik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <StatCard icon={Users} label="Pelajar Dipantau" value={String(totalStudents)} sub={`${stats.withEvidenceCount} sudah berprofil`} />
            <StatCard icon={CheckCircle2} label="Evidence Diluluskan" value={String(stats.approvedEvidenceCount)} sub={`daripada ${stats.programmeCount} program disahkan`} iconCls="bg-emerald-50 text-emerald-600" />
            <StatCard icon={TrendingUp} label="Potensi Tinggi" value={String(stats.highPotentialCount)} sub={`skor keseluruhan ≥ ${HIGH_POTENTIAL_THRESHOLD}`} iconCls="bg-blue-50 text-blue-600" />
            <StatCard icon={Gauge} label="Purata Skor Keseluruhan" value={stats.avgOverall ? String(stats.avgOverall) : '—'} sub="purata 3 kekuatan teratas" iconCls="bg-amber-50 text-amber-600" />
            <StatCard icon={FileCheck2} label="Program Disahkan" value={String(stats.programmeCount)} sub="lulus penuh + laporan disahkan" iconCls="bg-violet-50 text-violet-600" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            {/* Lajur utama */}
            <div className="xl:col-span-2 space-y-6">
              {/* Kad kompetensi */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-display text-lg font-bold text-slate-900">Kompetensi</h3>
                  <span className="text-xs text-slate-400">(cincin = purata skor pelajar yang mempunyai evidence)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {stats.competencyStats.map((c) => {
                    const Icon = COMPETENCY_ICON[c.code];
                    return (
                      <div key={c.code} className="rounded-xl border border-slate-200 p-3 flex items-center gap-3 hover:border-indigo-200 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Icon className="w-4 h-4 text-indigo-500 shrink-0" />
                            <p className="text-xs font-semibold truncate">{competencyName(c.code)}</p>
                          </div>
                          <p className="text-lg font-bold text-slate-900 font-display tabular-nums leading-tight mt-1">
                            {c.studentCount}
                            <span className="text-xs font-medium text-slate-400"> pelajar</span>
                          </p>
                        </div>
                        <ProgressRing value={c.avgScore} size={48} stroke={5} label={`Purata ${competencyName(c.code)}: ${c.avgScore}`} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4 text-xs text-slate-500">
                  {(['cemerlang', 'baik', 'berkembang', 'perlu'] as Band[]).map((b) => (
                    <span key={b} className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BAND_META[b].hex }} />
                      {BAND_META[b].label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pelajar teratas */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <h3 className="font-display text-lg font-bold text-slate-900">Pelajar Mengikut Skor Bakat Keseluruhan</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Cari nama, matrik, fakulti, kompetensi..."
                      className="w-full sm:w-80 border border-slate-300 rounded-xl py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                        <th className="py-2 pr-3 font-semibold">#</th>
                        <th className="py-2 pr-3 font-semibold">Pelajar</th>
                        <th className="py-2 pr-3 font-semibold">Skor Keseluruhan</th>
                        <th className="py-2 pr-3 font-semibold">Kekuatan Utama</th>
                        <th className="py-2 font-semibold text-right">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedRows.map((row, i) => (
                        <tr
                          key={row.user.uid}
                          onClick={() => setSelectedStudent(row.user)}
                          className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 cursor-pointer transition-colors"
                        >
                          <td className="py-3 pr-3"><RankBadge rank={i + 1} /></td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar name={(row.user as { displayName?: string }).displayName || row.user.name} />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">
                                  {(row.user as { displayName?: string }).displayName || row.user.name}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                  {[row.user.matricNumber, row.user.faculty].filter(Boolean).join(' · ') || row.user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            {row.overall > 0 ? (
                              <div className="flex items-center gap-2">
                                <span className="font-bold tabular-nums text-slate-900">{row.overall}</span>
                                <BandChip score={row.overall} />
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Tiada evidence lagi</span>
                            )}
                          </td>
                          <td className="py-3 pr-3">
                            {row.strengths[0] ? (
                              <span className="inline-flex items-center gap-1.5 text-slate-700">
                                <Award className="w-3.5 h-3.5 text-indigo-500" />
                                {competencyName(row.strengths[0].competency_id)}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-3 text-right tabular-nums text-slate-600">{row.approvedCount}</td>
                        </tr>
                      ))}
                      {displayedRows.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                            Tiada pelajar sepadan dengan carian.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Lajur kanan */}
            <div className="space-y-6">
              {/* Sorotan */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-display text-lg font-bold text-slate-900 mb-1">Sorotan Bakat</h3>
                <p className="text-xs text-slate-400 mb-4">Dikira daripada evidence semasa — bukan janaan AI.</p>
                <div className="space-y-3">
                  {sorotan.length === 0 && (
                    <p className="text-sm text-slate-500 italic">Tiada sorotan lagi — belum ada evidence.</p>
                  )}
                  {sorotan.map((s) => (
                    <div
                      key={s.title}
                      className={`rounded-xl border p-4 ${
                        s.tone === 'positive'
                          ? 'bg-emerald-50/60 border-emerald-100'
                          : s.tone === 'warning'
                          ? 'bg-amber-50/60 border-amber-100'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {s.tone === 'positive' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                        ) : s.tone === 'warning' ? (
                          <Info className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Info className="w-4 h-4 text-slate-400" />
                        )}
                        {s.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.body}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Taburan */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-display text-lg font-bold text-slate-900 mb-4">Taburan Bakat</h3>
                {donutData.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Belum ada data.</p>
                ) : (
                  <>
                    <div className="relative h-48" role="img" aria-label={`Taburan ${totalStudents} pelajar mengikut jalur skor`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={donutData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={58}
                            outerRadius={82}
                            paddingAngle={2}
                            isAnimationActive={false}
                          >
                            {donutData.map((d) => (
                              <Cell key={d.name} fill={d.hex} stroke="#ffffff" strokeWidth={2} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold font-display tabular-nums text-slate-900">{totalStudents}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Jumlah Pelajar</span>
                      </div>
                    </div>
                    <div className="mt-4 space-y-1.5">
                      {donutData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.hex }} />
                            {d.name}
                          </span>
                          <span className="tabular-nums font-semibold text-slate-900">
                            {d.value} ({totalStudents ? Math.round((d.value / totalStudents) * 100) : 0}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
