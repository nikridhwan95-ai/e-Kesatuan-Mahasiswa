import { useState, useEffect, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
  Clock,
  TrendingUp,
  Users2,
  Wallet,
  Coins,
  FileText,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { getApplications, getCategories, getReports, getUsers } from '../../services/dataService';
import { Application, Report, User } from '../../types';
import { StatCard } from '../bakat/ui';

// Peruntukan BHEP setiap semester (RM).
const SEMESTER_ALLOCATION = 200000;

// Warna TETAP per kategori 8 Teras — disahkan lulus semakan buta warna
// (deutan ΔE 16.7) dengan scripts validate_palette dataviz. Warna mengikut
// kategori, BUKAN susunan kemunculan, supaya kekal konsisten walau ditapis.
const CATEGORY_COLORS: Record<string, string> = {
  Kesukarelawanan: '#1d4ed8',
  Kepimpinan: '#d97706',
  Kebudayaan: '#991b1b',
  Sukan: '#0891b2',
  Keusahawanan: '#6d28d9',
  'Akademik & Intelektual': '#ea580c',
  Kerohanian: '#4338ca',
  'Kelestarian & Alam Sekitar': '#4d7c0f',
};
const FALLBACK_COLOR = '#64748b'; // kategori luar 8 Teras
const APPROVED_COLOR = '#1d4ed8'; // Kewangan Diluluskan
const USED_COLOR = '#059669'; // Kewangan Digunakan

const catColor = (cat: string) => CATEGORY_COLORS[cat] ?? FALLBACK_COLOR;

const fmtRM = (n: number) =>
  n.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtRMShort = (n: number) => (n >= 1000 ? `RM${Math.round(n / 1000)}k` : `RM${n}`);

const SOFTSKILL_OPTIONS = [
  'Kemahiran Berkomunikasi',
  'Pemikiran Kritis dan Kemahiran Penyelesaian Masalah',
  'Kemahiran Kerja Berpasukan',
  'Pembelajaran Berterusan dan Pengurusan Maklumat',
  'Kemahiran Keusahawanan',
  'Etika dan Moral Profesional',
  'Kemahiran Kepimpinan',
];

const LEVELS = ['Antarabangsa', 'Kebangsaan', 'Negeri', 'Universiti', 'Kolej atau Fakulti'];

export default function DataAnalyticsModule() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const DEFAULT_FILTERS = {
    tahun: 'Semua',
    sesi: 'Semua',
    semester: 'Semua',
    teras: 'Semua',
    peringkat: 'Semua',
    status: 'Semua',
    impak: 'Semua',
  };
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const activeFilterCount = Object.values(filters).filter((v) => v !== 'Semua').length;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [apps, cats, reps, usrs] = await Promise.all([
          getApplications('admin', ''),
          getCategories(),
          getReports('admin', ''),
          getUsers(),
        ]);
        setApplications(apps);
        setCategories(cats);
        setReports(reps);
        setUsers(usrs);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const nameByUid = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u.uid, (u as { displayName?: string }).displayName || u.name);
    return m;
  }, [users]);

  // Laporan disahkan sahaja — angka peserta & perbelanjaan datang dari sini.
  const verifiedReportByApp = useMemo(() => {
    const m = new Map<string, Report>();
    for (const r of reports) if (r.status === 'Disahkan') m.set(r.applicationId, r);
    return m;
  }, [reports]);

  // Pilihan penapis diterbitkan daripada data sebenar (bukan senarai kod keras).
  const yearOptions = useMemo(() => {
    const years = new Set<string>();
    for (const a of applications) {
      const y = new Date(a.startDate).getFullYear();
      if (!Number.isNaN(y)) years.add(String(y));
    }
    return ['Semua', ...Array.from(years).sort()];
  }, [applications]);

  const sesiOptions = useMemo(() => {
    const s = new Set<string>();
    for (const a of applications) if (a.academicSession) s.add(a.academicSession);
    return ['Semua', ...Array.from(s).sort()];
  }, [applications]);

  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    for (const a of applications) s.add(a.status);
    return ['Semua', ...Array.from(s).sort()];
  }, [applications]);

  const filteredApps = useMemo(() => {
    return applications.filter((app) => {
      const appYear = String(new Date(app.startDate).getFullYear());
      const matchesYear = filters.tahun === 'Semua' || appYear === filters.tahun;
      const matchesSesi = filters.sesi === 'Semua' || app.academicSession === filters.sesi;
      const matchesSemester = filters.semester === 'Semua' || app.semester === filters.semester;
      const matchesTeras = filters.teras === 'Semua' || app.category === filters.teras;
      const matchesPeringkat =
        filters.peringkat === 'Semua' || app.organizingLevel === filters.peringkat;
      const matchesStatus = filters.status === 'Semua' || app.status === filters.status;
      const matchesImpak =
        filters.impak === 'Semua' || (app.softSkills ?? []).includes(filters.impak);
      return (
        matchesYear &&
        matchesSesi &&
        matchesSemester &&
        matchesTeras &&
        matchesPeringkat &&
        matchesStatus &&
        matchesImpak
      );
    });
  }, [applications, filters]);

  // ── Statistik ringkasan (mengikut penapisan) ─────────────────────────────
  const summary = useMemo(() => {
    const approved = filteredApps.filter((a) => a.status === 'Lulus Sepenuhnya');
    let participants = 0;
    let budgetApproved = 0;
    let budgetUsed = 0;
    for (const a of approved) {
      budgetApproved += a.approvedAmount ?? 0;
      const rep = verifiedReportByApp.get(a.id);
      participants += rep?.participantCount ?? 0;
      budgetUsed += rep?.verifiedBudgetUsed ?? 0;
    }
    return {
      total: filteredApps.length,
      approvedCount: approved.length,
      approvalRate: filteredApps.length
        ? Math.round((approved.length / filteredApps.length) * 100)
        : 0,
      participants,
      budgetApproved,
      budgetUsed,
    };
  }, [filteredApps, verifiedReportByApp]);

  // ── Taburan mengikut teras (donut) ───────────────────────────────────────
  const donutData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of filteredApps) {
      counts.set(app.category, (counts.get(app.category) ?? 0) + 1);
    }
    // Susunan tetap mengikut senarai kategori supaya warna & tertib stabil.
    const ordered = [
      ...categories,
      ...Array.from(counts.keys()).filter((c) => !categories.includes(c)),
    ];
    return ordered
      .filter((cat) => (counts.get(cat) ?? 0) > 0)
      .map((cat) => ({ name: cat, value: counts.get(cat)!, hex: catColor(cat) }));
  }, [filteredApps, categories]);

  // ── Aktiviti mengikut suku tahun (bar bertindan) ─────────────────────────
  const quarterData = useMemo(() => {
    const quarters = ['Suku 1', 'Suku 2', 'Suku 3', 'Suku 4'].map(
      (name) => ({ name }) as Record<string, string | number>,
    );
    for (const app of filteredApps) {
      const month = new Date(app.startDate).getMonth();
      if (Number.isNaN(month)) continue;
      const q = quarters[Math.floor(month / 3)];
      q[app.category] = ((q[app.category] as number) ?? 0) + 1;
    }
    return quarters;
  }, [filteredApps]);

  const activeCategories = useMemo(() => donutData.map((d) => d.name), [donutData]);

  // ── Peserta mengikut peringkat × teras ───────────────────────────────────
  const participantMatrix = useMemo(() => {
    const rows = LEVELS.map((level) => {
      const row: Record<string, string | number> = { peringkat: level, total: 0 };
      for (const cat of categories) {
        let sum = 0;
        for (const app of filteredApps) {
          if (app.organizingLevel !== level || app.category !== cat) continue;
          sum += verifiedReportByApp.get(app.id)?.participantCount ?? 0;
        }
        row[cat] = sum;
        row.total = (row.total as number) + sum;
      }
      return row;
    });
    const totals: Record<string, number> = { total: 0 };
    for (const cat of categories) {
      totals[cat] = rows.reduce((a, r) => a + ((r[cat] as number) ?? 0), 0);
      totals.total += totals[cat];
    }
    return { rows, totals };
  }, [filteredApps, categories, verifiedReportByApp]);

  // ── Kewangan mengikut semester (global — peruntukan RM200k per semester) ─
  const semesterBudgetData = useMemo(() => {
    const bySemester = new Map<string, { approved: number; used: number }>();
    for (const app of applications) {
      if (!app.semester || !app.academicSession) continue;
      const key = `Sem ${app.semester} (${app.academicSession})`;
      const entry = bySemester.get(key) ?? { approved: 0, used: 0 };
      entry.approved += app.approvedAmount ?? 0;
      entry.used += verifiedReportByApp.get(app.id)?.verifiedBudgetUsed ?? 0;
      bySemester.set(key, entry);
    }
    return Array.from(bySemester.entries())
      .map(([name, d]) => ({ name, ...d }))
      .filter((d) => d.approved > 0 || d.used > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [applications, verifiedReportByApp]);

  // ── DATA KEPUTUSAN ───────────────────────────────────────────────────────

  // Jadual keputusan per teras: pelaburan vs pulangan (peserta) & mutu permohonan.
  const terasDecision = useMemo(() => {
    const rows = categories.map((cat) => {
      const apps = filteredApps.filter((a) => a.category === cat);
      const approved = apps.filter((a) => a.status === 'Lulus Sepenuhnya');
      const rejected = apps.filter((a) => a.status === 'Ditolak' || a.status === 'Dibatalkan');
      const decided = approved.length + rejected.length;
      let participants = 0;
      let used = 0;
      for (const a of approved) {
        const rep = verifiedReportByApp.get(a.id);
        participants += rep?.participantCount ?? 0;
        used += rep?.verifiedBudgetUsed ?? 0;
      }
      return {
        cat,
        total: apps.length,
        approvedCount: approved.length,
        approvalRate: decided > 0 ? Math.round((approved.length / decided) * 100) : null,
        participants,
        used,
        costPerParticipant: participants > 0 ? used / participants : null,
      };
    });
    const maxCost = Math.max(0, ...rows.map((r) => r.costPerParticipant ?? 0));
    return { rows, maxCost };
  }, [filteredApps, categories, verifiedReportByApp]);

  // Program lulus sepenuhnya yang laporannya BELUM disahkan — tindakan susulan.
  const pendingReports = useMemo(
    () =>
      filteredApps.filter((a) => a.status === 'Lulus Sepenuhnya' && !verifiedReportByApp.has(a.id)),
    [filteredApps, verifiedReportByApp],
  );

  // Sorotan keputusan berasaskan peraturan — setiap satu disertakan TINDAKAN.
  const decisionInsights = useMemo(() => {
    const out: {
      title: string;
      body: string;
      action: string;
      tone: 'positive' | 'warning' | 'info';
    }[] = [];
    const withData = terasDecision.rows.filter((r) => r.total > 0);

    // 1) Keseimbangan 8 Teras — teras tanpa aktiviti dalam skop semasa.
    if (filters.teras === 'Semua') {
      const empty = terasDecision.rows.filter((r) => r.total === 0).map((r) => r.cat);
      if (empty.length > 0 && withData.length > 0) {
        out.push({
          tone: 'warning',
          title: 'Teras Tanpa Aktiviti',
          body: `${empty.join(', ')} — tiada sebarang program dalam skop semasa.`,
          action:
            'Buka tawaran atau promosi program bagi teras berkenaan untuk keseimbangan 8 Teras.',
        });
      }
    }

    // 2) Nilai terbaik: kos per peserta terendah (jangkauan tertinggi per ringgit).
    const withCost = withData.filter((r) => r.costPerParticipant !== null && r.participants >= 30);
    if (withCost.length >= 2) {
      const best = withCost.reduce((a, b) =>
        a.costPerParticipant! < b.costPerParticipant! ? a : b,
      );
      out.push({
        tone: 'positive',
        title: 'Jangkauan Terbaik Setiap Ringgit',
        body: `Teras ${best.cat}: RM${best.costPerParticipant!.toFixed(2)} seorang peserta (${best.participants.toLocaleString('ms-MY')} peserta, RM${Math.round(best.used).toLocaleString('ms-MY')} dibelanja).`,
        action:
          'Pertimbangkan menambah peruntukan teras ini — jangkauan pelajar paling tinggi bagi setiap ringgit.',
      });
    }

    // 3) Mutu kertas kerja: kadar kelulusan terendah (sekurang-kurangnya 2 keputusan).
    const withRate = withData.filter(
      (r) =>
        r.approvalRate !== null &&
        r.approvedCount + (r.total - r.approvedCount) >= 2 &&
        r.approvalRate < 60,
    );
    if (withRate.length > 0) {
      const worst = withRate.reduce((a, b) => (a.approvalRate! < b.approvalRate! ? a : b));
      out.push({
        tone: 'warning',
        title: 'Kadar Kelulusan Rendah',
        body: `Teras ${worst.cat}: hanya ${worst.approvalRate}% permohonan diluluskan.`,
        action: 'Adakan bimbingan penyediaan kertas kerja untuk persatuan teras ini.',
      });
    }

    // 4) Laporan tertunggak — risiko pematuhan & bukti bakat tidak terjana.
    if (pendingReports.length > 0) {
      out.push({
        tone: 'warning',
        title: 'Laporan Pascaprogram Tertunggak',
        body: `${pendingReports.length} program lulus sepenuhnya masih belum mempunyai laporan yang disahkan.`,
        action:
          'Tuntut laporan — tanpa pengesahan, perbelanjaan tidak direkod dan bukti bakat pelajar tidak terjana.',
      });
    }

    // 5) Status peruntukan semester terkini.
    const latest = semesterBudgetData[semesterBudgetData.length - 1];
    if (latest) {
      const pct = Math.round((latest.approved / SEMESTER_ALLOCATION) * 100);
      const baki = SEMESTER_ALLOCATION - latest.approved;
      out.push({
        tone: pct >= 90 ? 'warning' : 'info',
        title: `Peruntukan ${latest.name}: ${pct}% Diluluskan`,
        body: `Baki RM${Math.round(baki).toLocaleString('ms-MY')} daripada RM${SEMESTER_ALLOCATION.toLocaleString('ms-MY')}.`,
        action:
          pct >= 90
            ? 'Peruntukan hampir habis — saring permohonan baharu dengan lebih ketat.'
            : 'Baki tidak dibawa ke semester hadapan — rancang penggunaan sebelum semester berakhir.',
      });
    }

    return out.slice(0, 5);
  }, [terasDecision, pendingReports, semesterBudgetData, filters.teras]);

  const generateAIInsight = async () => {
    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const categorySummary = donutData.map((d) => `${d.name}: ${d.value}`).join(', ');
      const prompt = `
        Berdasarkan data aktiviti pelajar universiti berikut (Tahun: ${filters.tahun}, Teras: ${filters.teras}, Peringkat: ${filters.peringkat}), berikan satu perenggan analisis eksekutif mengenai trend semasa dan cadangan penambahbaikan.

        Data Semasa (Ditapis):
        Jumlah Permohonan: ${summary.total}
        Permohonan Lulus Sepenuhnya: ${summary.approvedCount} (${summary.approvalRate}%)
        Bajet Diluluskan: RM${summary.budgetApproved.toLocaleString()}
        Bajet Digunakan (disahkan): RM${summary.budgetUsed.toLocaleString()}
        Jumlah Peserta Terlibat: ${summary.participants.toLocaleString()}
        Taburan Kategori Program: ${categorySummary}

        Sila berikan ulasan yang kritikal tetapi membina untuk membantu pihak pengurusan membuat keputusan yang lebih baik.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction:
            'Anda ialah penganalisis data universiti yang pakar dalam pembangunan pelajar. Berikan analisis yang profesional, padat dan berwawasan dalam Bahasa Melayu.',
        },
      });
      setAiInsight(response.text || 'Tiada analisis dapat dijana.');
    } catch (error) {
      console.error('Error generating AI insight:', error);
      setAiInsight('Gagal menjana analisis AI. Sila semak konfigurasi API.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Memuatkan data analitik...</p>
      </div>
    );
  }

  const hasData = filteredApps.length > 0;

  return (
    <div className="space-y-6">
      {/* Kepala modul */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-blue-600" /> Analitik Data
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Analisis aktiviti pelajar, penyertaan dan kewangan — angka peserta dan perbelanjaan
            diambil daripada laporan yang disahkan sahaja.
          </p>
        </div>
        <button
          onClick={generateAIInsight}
          disabled={isGeneratingAI}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {isGeneratingAI ? (
            <Clock className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400" />
          )}
          Jana Analisis AI
        </button>
      </div>

      {/* Penapis */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
            Penapis
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-semibold">
                {activeFilterCount} aktif
              </span>
            )}
          </p>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Set Semula Penapis
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FilterSelect
            label="Teras (Kategori)"
            value={filters.teras}
            options={['Semua', ...categories]}
            onChange={(val) => setFilters({ ...filters, teras: val })}
          />
          <FilterSelect
            label="Sesi Akademik"
            value={filters.sesi}
            options={sesiOptions}
            onChange={(val) => setFilters({ ...filters, sesi: val })}
          />
          <FilterSelect
            label="Semester"
            value={filters.semester}
            options={['Semua', '1', '2']}
            onChange={(val) => setFilters({ ...filters, semester: val })}
          />
          <FilterSelect
            label="Tahun Pelaksanaan"
            value={filters.tahun}
            options={yearOptions}
            onChange={(val) => setFilters({ ...filters, tahun: val })}
          />
          <FilterSelect
            label="Peringkat Penganjuran"
            value={filters.peringkat}
            options={['Semua', ...LEVELS]}
            onChange={(val) => setFilters({ ...filters, peringkat: val })}
          />
          <FilterSelect
            label="Status Permohonan"
            value={filters.status}
            options={statusOptions}
            onChange={(val) => setFilters({ ...filters, status: val })}
          />
          <FilterSelect
            label="Impak (Kemahiran Insaniah)"
            value={filters.impak}
            options={['Semua', ...SOFTSKILL_OPTIONS]}
            onChange={(val) => setFilters({ ...filters, impak: val })}
          />
        </div>
      </div>

      {/* Analisis AI */}
      {aiInsight && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-display tracking-wide text-sm">
              <Sparkles className="w-5 h-5" /> ANALISIS EKSEKUTIF AI
            </div>
            <button
              onClick={() => setAiInsight(null)}
              className="text-slate-400 hover:text-white text-xs font-medium"
            >
              Tutup
            </button>
          </div>
          <div className="text-slate-200 leading-relaxed text-sm relative z-10 whitespace-pre-wrap">
            {aiInsight}
          </div>
          <p className="mt-4 pt-3 border-t border-slate-700/50 text-[10px] text-slate-500 relative z-10">
            Dijana oleh Gemini AI · berdasarkan data penapisan semasa
          </p>
        </div>
      )}

      {/* Kad statistik */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          icon={FileText}
          label="Jumlah Permohonan"
          value={String(summary.total)}
          sub="mengikut penapisan semasa"
          iconCls="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={CheckCircle2}
          label="Lulus Sepenuhnya"
          value={String(summary.approvedCount)}
          sub={`kadar kelulusan ${summary.approvalRate}%`}
          iconCls="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Users2}
          label="Jumlah Peserta"
          value={summary.participants.toLocaleString('ms-MY')}
          sub="daripada laporan disahkan"
          iconCls="bg-violet-50 text-violet-600"
        />
        <StatCard
          icon={Wallet}
          label="Bajet Diluluskan"
          value={`RM${Math.round(summary.budgetApproved).toLocaleString('ms-MY')}`}
          sub="jumlah kelulusan TNC HEPA"
          iconCls="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={Coins}
          label="Bajet Digunakan"
          value={`RM${Math.round(summary.budgetUsed).toLocaleString('ms-MY')}`}
          sub="perbelanjaan disahkan"
          iconCls="bg-cyan-50 text-cyan-600"
        />
      </div>

      {/* Sorotan keputusan — apa yang perlu DIBUAT, bukan sekadar apa yang berlaku */}
      {decisionInsights.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-display text-lg font-bold text-slate-900 mb-1">Sorotan Keputusan</h3>
          <p className="text-xs text-slate-400 mb-4">
            Dikira daripada data skop semasa — setiap sorotan disertakan cadangan tindakan.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {decisionInsights.map((s) => (
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
                <p className="text-sm font-bold text-slate-900 flex items-start gap-1.5">
                  {s.tone === 'positive' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : s.tone === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  {s.title}
                </p>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{s.body}</p>
                <p className="text-xs text-slate-800 mt-2 leading-relaxed">
                  <span className="font-bold">Tindakan:</span> {s.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut: taburan teras */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-display text-lg font-bold text-slate-900 mb-1">
            Aktiviti Mengikut Teras
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Bilangan permohonan mengikut kategori 8 Teras.
          </p>
          {!hasData ? (
            <EmptyChart />
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div
                className="relative h-56 w-56 shrink-0"
                role="img"
                aria-label={`Taburan ${summary.total} aktiviti mengikut teras`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={90}
                      paddingAngle={2}
                      isAnimationActive={false}
                    >
                      {donutData.map((d) => (
                        <Cell key={d.name} fill={d.hex} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${Number(v)} aktiviti`, String(name)]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold font-display tabular-nums text-slate-900">
                    {summary.total}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Aktiviti</span>
                </div>
              </div>
              <div className="flex-1 w-full space-y-1.5">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs gap-2">
                    <span className="inline-flex items-center gap-1.5 text-slate-600 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.hex }}
                      />
                      <span className="truncate">{d.name}</span>
                    </span>
                    <span className="tabular-nums font-semibold text-slate-900 shrink-0">
                      {d.value} ({Math.round((d.value / summary.total) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bar bertindan: suku tahun */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-display text-lg font-bold text-slate-900 mb-1">
            Aktiviti Mengikut Suku Tahun
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Bertindan mengikut teras — warna sama seperti carta taburan.
          </p>
          {!hasData ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={quarterData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                {activeCategories.map((cat) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="teras"
                    fill={catColor(cat)}
                    stroke="#ffffff"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Jadual keputusan mengikut teras — pelaburan vs pulangan */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-display text-lg font-bold text-slate-900 mb-1">
          Prestasi Mengikut Teras (Data Keputusan)
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Bandingkan pelaburan dan pulangan setiap teras untuk memutuskan keutamaan peruntukan. Kos
          seorang peserta = perbelanjaan disahkan ÷ jumlah peserta.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2.5 pr-3 font-semibold">Teras</th>
                <th className="py-2.5 px-2 font-semibold text-right">Program</th>
                <th className="py-2.5 px-2 font-semibold text-right">Kadar Kelulusan</th>
                <th className="py-2.5 px-2 font-semibold text-right">Peserta</th>
                <th className="py-2.5 px-2 font-semibold text-right">Dibelanja (RM)</th>
                <th className="py-2.5 pl-2 font-semibold text-right">Kos / Peserta (RM)</th>
              </tr>
            </thead>
            <tbody>
              {terasDecision.rows.map((r) => (
                <tr
                  key={r.cat}
                  className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${r.total === 0 ? 'opacity-50' : ''}`}
                >
                  <td className="py-2.5 pr-3 font-medium text-slate-900">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: catColor(r.cat) }}
                      />
                      {r.cat}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">{r.total}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {r.approvalRate === null ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      `${r.approvalRate}%`
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {r.participants.toLocaleString('ms-MY')}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {r.used > 0 ? (
                      Math.round(r.used).toLocaleString('ms-MY')
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pl-2 text-right">
                    {r.costPerParticipant === null ? (
                      <span className="text-slate-300">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-2 justify-end">
                        <span className="hidden sm:block w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <span
                            className="block h-full rounded-full bg-blue-500"
                            style={{
                              width: `${terasDecision.maxCost ? Math.max(6, (r.costPerParticipant / terasDecision.maxCost) * 100) : 0}%`,
                            }}
                          />
                        </span>
                        <span className="tabular-nums font-semibold text-slate-900">
                          {r.costPerParticipant.toFixed(2)}
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matriks peserta */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-display text-lg font-bold text-slate-900 mb-1">
          Bilangan Peserta Mengikut Teras dan Peringkat Penganjuran
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Jumlah peserta daripada laporan pascaprogram yang disahkan sahaja.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2.5 pr-3 font-semibold">Peringkat Penganjuran</th>
                {categories.map((cat) => (
                  <th key={cat} className="py-2.5 px-2 font-semibold text-right">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: catColor(cat) }}
                      />
                      {cat}
                    </span>
                  </th>
                ))}
                <th className="py-2.5 pl-2 font-semibold text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {participantMatrix.rows.map((row) => (
                <tr
                  key={String(row.peringkat)}
                  className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                >
                  <td className="py-2.5 pr-3 font-medium text-slate-900">{row.peringkat}</td>
                  {categories.map((cat) => (
                    <td
                      key={cat}
                      className={`py-2.5 px-2 text-right tabular-nums ${(row[cat] as number) > 0 ? 'text-slate-900' : 'text-slate-300'}`}
                    >
                      {(row[cat] as number).toLocaleString('ms-MY')}
                    </td>
                  ))}
                  <td className="py-2.5 pl-2 text-right tabular-nums font-bold text-slate-900">
                    {(row.total as number).toLocaleString('ms-MY')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold text-slate-900">
                <td className="py-2.5 pr-3 rounded-l-lg">Jumlah</td>
                {categories.map((cat) => (
                  <td key={cat} className="py-2.5 px-2 text-right tabular-nums">
                    {(participantMatrix.totals[cat] ?? 0).toLocaleString('ms-MY')}
                  </td>
                ))}
                <td className="py-2.5 pl-2 text-right tabular-nums rounded-r-lg">
                  {participantMatrix.totals.total.toLocaleString('ms-MY')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Kewangan semester */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-8">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 mb-1">
            Penggunaan Peruntukan Mengikut Semester
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Peruntukan RM{SEMESTER_ALLOCATION.toLocaleString('ms-MY')} setiap semester (tidak
            terkesan oleh penapisan). Diluluskan = kelulusan TNC HEPA · Digunakan = perbelanjaan
            pada laporan disahkan.
          </p>
          {semesterBudgetData.length === 0 ? (
            <EmptyChart label="Tiada data kewangan lagi." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={semesterBudgetData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmtRMShort}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => `RM ${fmtRM(Number(v))}`} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar
                  name="Kewangan Diluluskan"
                  dataKey="approved"
                  fill={APPROVED_COLOR}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
                <Bar
                  name="Kewangan Digunakan"
                  dataKey="used"
                  fill={USED_COLOR}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Laporan kewangan keseluruhan */}
        {semesterBudgetData.length > 0 && (
          <div className="border-t border-slate-100 pt-6">
            <h4 className="font-display text-base font-bold text-slate-900 mb-4">
              Laporan Kewangan Keseluruhan
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                    <th className="py-2.5 pr-3 font-semibold">Semester & Sesi Akademik</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Peruntukan (RM)</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Diluluskan (RM)</th>
                    <th className="py-2.5 px-2 font-semibold text-right">Digunakan (RM)</th>
                    <th className="py-2.5 pl-2 font-semibold text-right">Baki Peruntukan (RM)</th>
                  </tr>
                </thead>
                <tbody>
                  {semesterBudgetData.map((row) => {
                    const baki = SEMESTER_ALLOCATION - row.approved;
                    return (
                      <tr
                        key={row.name}
                        className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-2.5 pr-3 font-medium text-slate-900">{row.name}</td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-slate-600">
                          {fmtRM(SEMESTER_ALLOCATION)}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-blue-700">
                          {fmtRM(row.approved)}
                        </td>
                        <td className="py-2.5 px-2 text-right tabular-nums text-emerald-700">
                          {fmtRM(row.used)}
                        </td>
                        <td
                          className={`py-2.5 pl-2 text-right tabular-nums font-bold ${baki < 0 ? 'text-red-600' : 'text-slate-900'}`}
                        >
                          {fmtRM(baki)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900">
                    <td className="py-2.5 pr-3 rounded-l-lg">Jumlah Keseluruhan</td>
                    <td className="py-2.5 px-2 text-right tabular-nums">
                      {fmtRM(semesterBudgetData.length * SEMESTER_ALLOCATION)}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-blue-700">
                      {fmtRM(semesterBudgetData.reduce((s, r) => s + r.approved, 0))}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-emerald-700">
                      {fmtRM(semesterBudgetData.reduce((s, r) => s + r.used, 0))}
                    </td>
                    <td className="py-2.5 pl-2 text-right tabular-nums rounded-r-lg">
                      {fmtRM(
                        semesterBudgetData.length * SEMESTER_ALLOCATION -
                          semesterBudgetData.reduce((s, r) => s + r.approved, 0),
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Senarai terperinci per program */}
        {semesterBudgetData.length > 0 && (
          <div className="border-t border-slate-100 pt-6">
            <h4 className="font-display text-base font-bold text-slate-900 mb-4">
              Senarai Terperinci Kewangan Program
            </h4>
            <div className="space-y-6">
              {semesterBudgetData.map((semesterRow) => {
                const semesterApps = applications.filter(
                  (app) =>
                    app.semester &&
                    app.academicSession &&
                    `Sem ${app.semester} (${app.academicSession})` === semesterRow.name &&
                    ((app.approvedAmount ?? 0) > 0 ||
                      (verifiedReportByApp.get(app.id)?.verifiedBudgetUsed ?? 0) > 0),
                );
                if (semesterApps.length === 0) return null;
                return (
                  <div
                    key={semesterRow.name}
                    className="rounded-xl border border-slate-200 overflow-hidden"
                  >
                    <p className="bg-slate-50 px-4 py-2.5 font-semibold text-slate-900 text-sm border-b border-slate-200">
                      {semesterRow.name}
                    </p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                          <th className="py-2 px-4 font-semibold">Nama Program</th>
                          <th className="py-2 px-4 font-semibold">Pemohon</th>
                          <th className="py-2 px-4 font-semibold text-right">Diluluskan (RM)</th>
                          <th className="py-2 px-4 font-semibold text-right">Digunakan (RM)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {semesterApps.map((app) => {
                          const used = verifiedReportByApp.get(app.id)?.verifiedBudgetUsed ?? 0;
                          const approvedAmt = app.approvedAmount ?? 0;
                          return (
                            <tr
                              key={app.id}
                              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors"
                            >
                              <td className="py-2.5 px-4 font-medium text-slate-900">
                                {app.title}
                              </td>
                              <td className="py-2.5 px-4 text-slate-600">
                                {nameByUid.get(app.applicantId) ?? '—'}
                                {app.applicantPosition ? ` (${app.applicantPosition})` : ''}
                              </td>
                              <td className="py-2.5 px-4 text-right tabular-nums text-blue-700">
                                {approvedAmt > 0 ? fmtRM(approvedAmt) : '—'}
                              </td>
                              <td className="py-2.5 px-4 text-right tabular-nums text-emerald-700">
                                {used > 0 ? fmtRM(used) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ label = 'Tiada data untuk penapisan semasa.' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center h-56 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
      <p className="text-sm text-slate-400 italic">{label}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
