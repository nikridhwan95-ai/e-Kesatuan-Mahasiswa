import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Filter, Download, ChevronDown, Loader2, Sparkles, Clock } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { getApplications, getCategories, getReports } from '../../services/dataService';
import { Application, Report } from '../../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

export default function DataAnalyticsModule() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [filters, setFilters] = useState({
    tahun: '2026',
    teras: 'All',
    peringkat: 'All',
    anjuran: 'All',
    impak: 'All'
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [apps, cats, reps] = await Promise.all([
          getApplications('admin', ''),
          getCategories(),
          getReports('admin', '')
        ]);
        setApplications(apps);
        setCategories(cats);
        setReports(reps);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const appYear = new Date(app.startDate).getFullYear().toString();
      const matchesYear = filters.tahun === 'All' || appYear === filters.tahun;
      const matchesTeras = filters.teras === 'All' || app.category === filters.teras;
      const matchesPeringkat = filters.peringkat === 'All' || app.organizingLevel === filters.peringkat;
      const matchesImpak = filters.impak === 'All' || (app.softSkills && app.softSkills.includes(filters.impak));
      // Anjuran is not clearly defined in Application, so we'll skip it for now or assume it matches all
      return matchesYear && matchesTeras && matchesPeringkat && matchesImpak;
    });
  }, [applications, filters]);

  const donutData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredApps.forEach(app => {
      counts[app.category] = (counts[app.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [filteredApps]);

  const barData = useMemo(() => {
    const quarters: Record<string, Record<string, number>> = {
      'Qtr 1': {}, 'Qtr 2': {}, 'Qtr 3': {}, 'Qtr 4': {}
    };
    
    filteredApps.forEach(app => {
      const month = new Date(app.startDate).getMonth();
      const qtr = `Qtr ${Math.floor(month / 3) + 1}`;
      quarters[qtr][app.category] = (quarters[qtr][app.category] || 0) + 1;
    });

    return Object.entries(quarters).map(([name, values]) => ({
      name,
      ...values
    }));
  }, [filteredApps]);

  const tableData = useMemo(() => {
    const levels = ['Antarabangsa', 'Kebangsaan', 'Negeri', 'Universiti', 'Kolej atau Fakulti'];
    const cats = categories.length > 0 ? categories : Array.from(new Set(applications.map(a => a.category)));
    
    return levels.map(level => {
      const row: any = { peringkat: level, total: 0 };
      cats.forEach(cat => {
        const appsInCell = filteredApps.filter(app => app.organizingLevel === level && app.category === cat);
        let participantSum = 0;
        appsInCell.forEach(app => {
          const report = reports.find(r => r.applicationId === app.id && r.status === 'Disahkan');
          if (report && report.participantCount) {
            participantSum += report.participantCount;
          }
        });
        row[cat] = participantSum;
        row.total += participantSum;
      });
      return row;
    });
  }, [filteredApps, categories, applications, reports]);

  const totals = useMemo(() => {
    const cats = categories.length > 0 ? categories : Array.from(new Set(applications.map(a => a.category)));
    const res: any = { total: 0 };
    cats.forEach(cat => {
      const appsInCat = filteredApps.filter(app => app.category === cat);
      let participantSum = 0;
      appsInCat.forEach(app => {
        const report = reports.find(r => r.applicationId === app.id && r.status === 'Disahkan');
        if (report && report.participantCount) {
          participantSum += report.participantCount;
        }
      });
      res[cat] = participantSum;
      res.total += participantSum;
    });
    return res;
  }, [filteredApps, categories, applications, reports]);

  const semesterBudgetData = useMemo(() => {
    const semesterData: Record<string, { approved: number; used: number }> = {};

    // Use all applications for budget tracking, not just filtered ones, 
    // because the RM200,000 allocation is global per semester.
    applications.forEach(app => {
      if (!app.semester || !app.academicSession) return;
      
      const semesterKey = `Sem ${app.semester} (${app.academicSession})`;
      if (!semesterData[semesterKey]) {
        semesterData[semesterKey] = { approved: 0, used: 0 };
      }
      
      // Approved budget
      if (app.approvedAmount) {
        semesterData[semesterKey].approved += app.approvedAmount;
      }

      // Used budget (from verified reports)
      const report = reports.find(r => r.applicationId === app.id && r.status === 'Disahkan');
      if (report && report.verifiedBudgetUsed) {
        semesterData[semesterKey].used += report.verifiedBudgetUsed;
      }
    });

    return Object.entries(semesterData)
      .map(([name, data]) => ({
        name,
        approved: data.approved,
        used: data.used
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [applications, reports]);

  const generateAIInsight = async () => {
    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Prepare data summary for AI
      const totalApps = filteredApps.length;
      const approvedApps = filteredApps.filter(a => a.status === 'Lulus Sepenuhnya').length;
      const totalBudget = filteredApps.reduce((sum, a) => sum + a.budget, 0);
      const categorySummary = donutData.map(d => `${d.name}: ${d.value}`).join(', ');
      
      // Calculate total participants from table data
      const totalParticipants = totals.total;

      const prompt = `
        Berdasarkan data aktiviti pelajar universiti berikut (Tahun: ${filters.tahun}, Teras: ${filters.teras}, Peringkat: ${filters.peringkat}), berikan satu perenggan analisis eksekutif mengenai trend semasa dan cadangan penambahbaikan.
        
        Data Semasa (Filtered):
        Jumlah Permohonan: ${totalApps}
        Permohonan Lulus Sepenuhnya: ${approvedApps}
        Jumlah Bajet Dimohon: RM${totalBudget.toLocaleString()}
        Jumlah Peserta Terlibat: ${totalParticipants.toLocaleString()}
        Taburan Kategori Program: ${categorySummary}
        
        Sila berikan ulasan yang kritikal tetapi membina untuk membantu pihak pengurusan membuat keputusan yang lebih baik.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: "Anda adalah penganalisis data universiti yang pakar dalam pembangunan pelajar. Berikan analisis yang profesional, padat, dan berwawasan dalam Bahasa Melayu.",
        }
      });

      setAiInsight(response.text || "Tiada analisis dapat dijana.");
    } catch (error) {
      console.error("Error generating AI insight:", error);
      setAiInsight("Gagal menjana analisis AI. Sila semak konfigurasi API.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-500 font-medium">Memuatkan data analitik...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="bg-[#8B1D3D] p-6 rounded-2xl shadow-lg text-white">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <div className="flex flex-wrap gap-4 flex-1 w-full">
            <FilterSelect 
              label="TAHUN PELAKSANAAN" 
              value={filters.tahun} 
              options={['All', '2023', '2024', '2025', '2026']}
              onChange={(val) => setFilters({...filters, tahun: val})}
            />
            <FilterSelect 
              label="KATEGORI (JENIS TERAS)" 
              value={filters.teras} 
              options={['All', ...categories]}
              onChange={(val) => setFilters({...filters, teras: val})}
            />
            <FilterSelect 
              label="PERINGKAT PENGANJURAN" 
              value={filters.peringkat} 
              options={['All', 'Antarabangsa', 'Kebangsaan', 'Negeri', 'Universiti', 'Kolej atau Fakulti']}
              onChange={(val) => setFilters({...filters, peringkat: val})}
            />
            <FilterSelect 
              label="IMPAK (KEMAHIRAN INSANIAH)" 
              value={filters.impak} 
              options={[
                'All',
                'Kemahiran Berkomunikasi',
                'Pemikiran Kritis dan Kemahiran Penyelesaian Masalah',
                'Kemahiran Kerja Berpasukan',
                'Pembelajaran Berterusan dan Pengurusan Maklumat',
                'Kemahiran Keusahawanan',
                'Etika dan Moral Profesional',
                'Kemahiran Kepimpinan'
              ]}
              onChange={(val) => setFilters({...filters, impak: val})}
            />
          </div>
          <div className="shrink-0">
            <button
              onClick={generateAIInsight}
              disabled={isGeneratingAI}
              className="flex items-center gap-2 bg-white text-[#8B1D3D] px-6 py-3 rounded-xl font-bold hover:bg-slate-100 transition-all duration-200 disabled:opacity-50 shadow-lg"
            >
              {isGeneratingAI ? <Clock className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              Jana Analisis AI
            </button>
          </div>
        </div>
      </div>

      {/* AI Insight Card */}
      {aiInsight && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-8 shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2 text-amber-400 font-bold font-display tracking-wide">
              <Sparkles className="w-6 h-6" />
              ANALISIS EKSEKUTIF AI
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
          <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center relative z-10">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Generated by Gemini AI</span>
            <span className="text-[10px] text-slate-500 italic">Berdasarkan data tapisan semasa</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-center font-bold text-slate-800 mb-6 uppercase tracking-wider">Bil Aktiviti Mengikut 8 Teras</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${value}`}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-center font-bold text-slate-800 mb-6 uppercase tracking-wider">Bil Aktiviti Mengikut Teras (Suku Tahun)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Legend verticalAlign="top" align="right" />
                {categories.map((cat, idx) => (
                  <Bar key={cat} dataKey={cat} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs font-bold text-slate-500 mt-2">Suku Tahun (Quarter)</p>
        </div>

        {/* Pie Chart - Replaced with Budget Analysis or similar if needed, but keeping as per original request for "Bil Pelajar" */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-center font-bold text-slate-800 mb-6 uppercase tracking-wider">Taburan Aktiviti Mengikut Teras</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${value}`}
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <h3 className="text-center font-bold text-slate-800 mb-6 uppercase tracking-wider">Bil Pelajar Mengikut Aktiviti Mengikut 8 Teras Dan 5 Peringkat Penganjuran</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-500 uppercase bg-slate-50">
                <tr>
                  <th className="px-4 py-3 border-b">Peringkat Penganjuran</th>
                  {categories.map(cat => (
                    <th key={cat} className="px-4 py-3 border-b">{cat}</th>
                  ))}
                  <th className="px-4 py-3 border-b">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 font-medium text-slate-900">{row.peringkat}</td>
                    {categories.map(cat => (
                      <td key={cat} className="px-4 py-4">{row[cat] || 0}</td>
                    ))}
                    <td className="px-4 py-4 font-bold">{row.total}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-bold">
                <tr>
                  <td className="px-4 py-3">Total</td>
                  {categories.map(cat => (
                    <td key={cat} className="px-4 py-3">{totals[cat] || 0}</td>
                  ))}
                  <td className="px-4 py-3">{totals.total}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Semester Budget Usage Chart */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-center font-bold text-slate-800 mb-6 uppercase tracking-wider">Status Penggunaan Peruntukan Mengikut Semester</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={semesterBudgetData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(value) => `RM${value}`} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  formatter={(value: number) => [`RM ${value.toLocaleString()}`, '']}
                />
                <Legend verticalAlign="top" align="right" />
                <Bar name="Kewangan Diluluskan" dataKey="approved" fill="#8B1D3D" radius={[4, 4, 0, 0]} />
                <Bar name="Kewangan Digunakan" dataKey="used" fill="#00C49F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-center text-xs text-slate-500 mt-4 italic mb-8">
            * Kewangan Diluluskan: Selepas pengesahan unit pembentangan | Kewangan Digunakan: Selepas pengesahan laporan
          </p>

          {/* Laporan Kewangan Table */}
          <div className="mt-8 border-t border-slate-100 pt-8">
            <h3 className="text-center font-bold text-slate-800 mb-6 uppercase tracking-wider">Laporan Kewangan Keseluruhan</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-xl">Semester & Sesi Akademik</th>
                    <th className="px-4 py-3 text-right">Peruntukan (RM)</th>
                    <th className="px-4 py-3 text-right">Diluluskan (RM)</th>
                    <th className="px-4 py-3 text-right">Digunakan (RM)</th>
                    <th className="px-4 py-3 text-right rounded-tr-xl">Baki Peruntukan (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {semesterBudgetData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">Tiada data kewangan untuk penapisan semasa.</td>
                    </tr>
                  ) : (
                    semesterBudgetData.map((row, index) => {
                      const peruntukan = 200000;
                      const baki = peruntukan - row.approved;
                      return (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 font-medium text-slate-900">{row.name}</td>
                          <td className="px-4 py-4 text-right font-mono text-slate-600">{peruntukan.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-4 text-right font-mono text-rose-600">{row.approved.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-4 text-right font-mono text-emerald-600">{row.used.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className={`px-4 py-4 text-right font-mono font-bold ${baki < 0 ? 'text-red-600' : 'text-slate-900'}`}>
                            {baki.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {semesterBudgetData.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-200">
                    <tr>
                      <td className="px-4 py-3">Jumlah Keseluruhan</td>
                      <td className="px-4 py-3 text-right font-mono">{(semesterBudgetData.length * 200000).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-mono text-rose-600">{semesterBudgetData.reduce((sum, row) => sum + row.approved, 0).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-600">{semesterBudgetData.reduce((sum, row) => sum + row.used, 0).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-mono">{(semesterBudgetData.length * 200000 - semesterBudgetData.reduce((sum, row) => sum + row.approved, 0)).toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Senarai Kewangan Terperinci */}
          <div className="mt-12 border-t border-slate-100 pt-8">
            <h3 className="text-center font-bold text-slate-800 mb-6 uppercase tracking-wider">Senarai Terperinci Kewangan Program</h3>
            <div className="space-y-8">
              {semesterBudgetData.map((semesterRow, idx) => {
                const semesterApps = applications.filter(app => 
                  app.semester && app.academicSession && 
                  `Sem ${app.semester} (${app.academicSession})` === semesterRow.name &&
                  (app.approvedAmount || reports.find(r => r.applicationId === app.id && r.status === 'Disahkan')?.verifiedBudgetUsed)
                );

                if (semesterApps.length === 0) return null;

                return (
                  <div key={idx} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-4 text-lg">{semesterRow.name}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
                        <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3">Nama Program</th>
                            <th className="px-4 py-3">Penganjur</th>
                            <th className="px-4 py-3 text-right">Diluluskan (RM)</th>
                            <th className="px-4 py-3 text-right">Digunakan (RM)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {semesterApps.map((app, appIdx) => {
                            const report = reports.find(r => r.applicationId === app.id && r.status === 'Disahkan');
                            const usedAmount = report?.verifiedBudgetUsed || 0;
                            const approvedAmount = app.approvedAmount || 0;
                            
                            return (
                              <tr key={appIdx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-900">{app.name}</td>
                                <td className="px-4 py-3 text-slate-600">{app.clubName || '-'}</td>
                                <td className="px-4 py-3 text-right font-mono text-rose-600">{approvedAmount > 0 ? approvedAmount.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                                <td className="px-4 py-3 text-right font-mono text-emerald-600">{usedAmount > 0 ? usedAmount.toLocaleString('ms-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (val: string) => void }) {
  return (
    <div className="flex-1 min-w-[150px]">
      <label className="block text-[10px] font-bold mb-1 opacity-80">{label}</label>
      <div className="relative">
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-xs font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer hover:bg-white/20 transition-colors"
        >
          {options.map(opt => (
            <option key={opt} value={opt} className="text-slate-900">{opt}</option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 opacity-60 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
