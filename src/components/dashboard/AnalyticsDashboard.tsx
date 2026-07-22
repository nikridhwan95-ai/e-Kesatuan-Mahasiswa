import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Clock, Activity, ShieldAlert, FileText, CheckCircle, AlertCircle, Users, Wallet, Sparkles, Loader2 } from 'lucide-react';
import { UserRole, Application, Report } from '../../types';
import { getApplications, getReports } from '../../services/dataService';
import { getCurrentAppUser } from '../../supabase';
import { GoogleGenAI } from '@google/genai';

interface AnalyticsDashboardProps {
  currentUserRole: UserRole;
}

const SEMESTER_BUDGET = 200000;

const COLORS = ['#2563eb', '#d97706', '#10b981', '#64748b'];

import { getCurrentAcademicSession, getCurrentSemester, generateAcademicSessions } from '../../utils/dateUtils';

export default function AnalyticsDashboard({ currentUserRole }: AnalyticsDashboardProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedSemester, setSelectedSemester] = useState(getCurrentSemester());
  const [selectedAcademicSession, setSelectedAcademicSession] = useState(getCurrentAcademicSession());
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const academicSessions = generateAcademicSessions(5);

  useEffect(() => {
    fetchDashboardData();
  }, [currentUserRole]);

  const fetchDashboardData = async () => {
    try {
      const uid = (await getCurrentAppUser())?.uid || '';
      const [appsData, reportsData] = await Promise.all([
        getApplications(currentUserRole, uid),
        getReports(currentUserRole, uid)
      ]);
      setApplications(appsData);
      setReports(reportsData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  // Process data for charts
  const dataKategori = useMemo(() => {
    const categories: Record<string, number> = {};
    applications.forEach(app => {
      const category = app.category || 'Lain-lain';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    // Format for chart (simplified for now, just showing total by category)
    return Object.keys(categories).map(cat => ({
      name: cat,
      value: categories[cat]
    }));
  }, [applications]);

  const dataBajet = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    let pending = 0;

    applications.forEach(app => {
      if (app.status === 'Lulus Sepenuhnya') approved += app.budget;
      else if (app.status === 'Ditolak') rejected += app.budget;
      else pending += app.budget;
    });

    return [
      { name: 'Lulus', value: approved },
      { name: 'Ditolak', value: rejected },
      { name: 'Menunggu', value: pending },
    ];
  }, [applications]);

  // Calculate semester budget usage
  const { totalApproved, totalVerifiedUsed, usagePercentage, remainingBudget, progressColor } = useMemo(() => {
    // Filter by academic session and semester
    const filteredApps = applications.filter(app => 
      app.academicSession === selectedAcademicSession && 
      app.semester === selectedSemester
    );
    
    const approvedApps = filteredApps.filter(app => app.status === 'Lulus Sepenuhnya');
    
    // Filter reports based on the filtered applications
    const filteredAppIds = new Set(filteredApps.map(app => app.id));
    const verifiedReports = reports.filter(report => 
      report.status === 'Disahkan' && filteredAppIds.has(report.applicationId)
    );
    
    const totalApproved = approvedApps.reduce((sum, app) => sum + (app.approvedAmount || app.budget), 0);
    const totalUsed = verifiedReports.reduce((sum, report) => sum + (report.verifiedBudgetUsed || 0), 0);
    
    const percentage = Math.min((totalApproved / SEMESTER_BUDGET) * 100, 100);
    const remaining = Math.max(SEMESTER_BUDGET - totalApproved, 0);
    
    let color = 'bg-blue-600';
    if (percentage > 90) color = 'bg-red-500';
    else if (percentage > 70) color = 'bg-amber-500';

    return {
      totalApproved,
      totalVerifiedUsed: totalUsed,
      usagePercentage: percentage,
      remainingBudget: remaining,
      progressColor: color
    };
  }, [applications, reports, selectedSemester, selectedAcademicSession]);

  const getStats = () => {
    const total = applications.length;
    const pending = applications.filter(a => ['Menunggu Semakan', 'Menunggu Pembentangan', 'Menunggu Kelulusan YDP', 'Menunggu Kelulusan TNC HEPA'].includes(a.status)).length;
    const approved = applications.filter(a => a.status === 'Lulus Sepenuhnya').length;
    const rejected = applications.filter(a => a.status === 'Ditolak').length;
    const approvedBudget = applications.filter(a => a.status === 'Lulus Sepenuhnya').reduce((sum, a) => sum + (a.approvedAmount || a.budget), 0);

    switch (currentUserRole) {
      case 'student':
        return [
          { title: 'Permohonan Saya', value: total.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Sedang Diproses', value: pending.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { title: 'Lulus Sepenuhnya', value: approved.toString(), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Ditolak', value: rejected.toString(), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ];
      case 'unit_semakan':
      case 'unit_pembentangan':
      case 'unit_kertas_kerja':
      case 'unit_pelaporan':
        return [
          { title: 'Perlu Disemak', value: pending.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { title: 'Telah Disemak', value: (approved + rejected).toString(), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Menunggu Semakan KM', value: applications.filter(a => a.status === 'Menunggu Pembentangan').length.toString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Jumlah Permohonan', value: total.toString(), icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ];
      case 'admin':
        return [
          { title: 'Jumlah Permohonan', value: total.toString(), icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Menunggu Semakan KM', value: applications.filter(a => a.status === 'Menunggu Pembentangan').length.toString(), icon: Users, color: 'text-amber-600', bg: 'bg-amber-50' },
          { title: 'Menunggu Kelulusan YDP', value: applications.filter(a => a.status === 'Menunggu Kelulusan YDP').length.toString(), icon: Clock, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { title: 'Peruntukan Lulus', value: `RM ${approvedBudget.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ];
      case 'ydp':
        return [
          { title: 'Perlu Diluluskan', value: applications.filter(a => a.status === 'Menunggu Kelulusan YDP').length.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { title: 'Telah Lulus', value: approved.toString(), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Peruntukan Lulus', value: `RM ${approvedBudget.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Permohonan Ditolak', value: rejected.toString(), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ];
      case 'tnc_hepa':
        return [
          { title: 'Perlu Diluluskan', value: applications.filter(a => a.status === 'Menunggu Kelulusan TNC HEPA').length.toString(), icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { title: 'Telah Lulus', value: approved.toString(), icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Peruntukan Lulus', value: `RM ${approvedBudget.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: 'Permohonan Ditolak', value: rejected.toString(), icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ];
      default:
        return [];
    }
  };

  const stats = getStats();

  const generateAIInsight = async () => {
    setIsGeneratingAI(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const totalApps = applications.length;
      const approvedApps = applications.filter(a => a.status === 'Lulus Sepenuhnya').length;
      const totalBudget = applications.reduce((sum, a) => sum + a.budget, 0);
      
      const prompt = `
        Sebagai penganalisis data universiti, berikan satu perenggan ringkas (3-4 ayat) analisis eksekutif berdasarkan data berikut:
        - Peranan Pengguna: ${currentUserRole}
        - Jumlah Permohonan: ${totalApps}
        - Permohonan Lulus: ${approvedApps}
        - Jumlah Bajet Terlibat: RM${totalBudget.toLocaleString()}
        - Sesi: ${selectedAcademicSession}, Semester: ${selectedSemester}
        
        Berikan fokus kepada prestasi pengurusan aktiviti dan cadangan ringkas. Gunakan Bahasa Melayu yang profesional.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAiInsight(response.text || "Tiada analisis dapat dijana.");
    } catch (error) {
      console.error("Error generating AI insight:", error);
      setAiInsight("Gagal menjana analisis AI.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const getRoleTitle = () => {
    switch(currentUserRole) {
      case 'student': return 'Papan Pemuka Pelajar';
      case 'unit_semakan': return 'Papan Pemuka KM (Unit Semakan)';
      case 'unit_pembentangan': return 'Papan Pemuka KM (Unit Pembentangan)';
      case 'unit_kertas_kerja': return 'Papan Pemuka KM (Unit Kertas Kerja)';
      case 'unit_pelaporan': return 'Papan Pemuka KM (Unit Pelaporan)';
      case 'admin': return 'Papan Pemuka System Admin';
      case 'ydp': return 'Papan Pemuka Eksekutif (YDP MPP)';
      case 'tnc_hepa': return 'Papan Pemuka Eksekutif (TNC HEPA)';
      default: return 'Papan Pemuka Analitik';
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">{getRoleTitle()}</h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {currentUserRole === 'student' 
              ? 'Ringkasan permohonan dan status program anda.' 
              : 'Ringkasan data program pelajar dan penggunaan bajet keseluruhan universiti.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {['admin', 'ydp', 'tnc_hepa'].includes(currentUserRole) && (
            <button
              onClick={generateAIInsight}
              disabled={isGeneratingAI}
              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 shadow-sm text-sm"
            >
              {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
              Jana Analisis AI
            </button>
          )}
          <select 
            value={selectedAcademicSession}
            onChange={(e) => setSelectedAcademicSession(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium cursor-pointer shadow-sm"
          >
            {academicSessions.map(session => (
              <option key={session} value={session}>Sesi {session}</option>
            ))}
          </select>
          
          <select 
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium cursor-pointer shadow-sm"
          >
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>
        </div>
      </div>

      {/* AI Insight Card */}
      {aiInsight && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
              <Sparkles className="w-5 h-5 text-amber-300" />
              RUMUSAN EKSEKUTIF AI
            </div>
            <button 
              onClick={() => setAiInsight(null)}
              className="text-white/60 hover:text-white text-xs"
            >
              Tutup
            </button>
          </div>
          <p className="text-sm leading-relaxed relative z-10 font-medium opacity-90">
            {aiInsight}
          </p>
        </div>
      )}

      {/* Semester Budget Tracker - Visible for Management Roles */}
      {['admin', 'ydp', 'tnc_hepa', 'unit_semakan', 'unit_pembentangan', 'unit_kertas_kerja', 'unit_pelaporan'].includes(currentUserRole) && (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display tracking-tight">Had Kewangan Berasaskan Semester</h3>
                <p className="text-sm text-slate-500">Pemantauan peruntukan RM200,000 bagi setiap semester.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kewangan yang Diluluskan</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">RM {totalApproved.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-1">Jumlah peruntukan yang telah diluluskan oleh TNC HEPA</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Kewangan yang Digunakan</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">RM {totalVerifiedUsed.toLocaleString()}</p>
                <p className="text-[10px] text-slate-400 mt-1">Jumlah peruntukan yang disahkan menggunakan peruntukan BHEP</p>
              </div>
            </div>

            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm font-medium text-slate-500">Status Penggunaan Peruntukan Semester</p>
              </div>
              <div className="text-right">
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{usagePercentage.toFixed(1)}%</p>
                <p className="text-sm font-medium text-slate-500 mt-1">Penggunaan</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ease-out ${progressColor}`}
                style={{ width: `${usagePercentage}%` }}
              ></div>
            </div>

            <div className="flex items-center gap-2 mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <AlertCircle className="w-5 h-5 text-slate-400 shrink-0" />
              <p className="text-sm font-medium text-slate-600">
                Baki dana <span className="font-bold text-slate-900">RM {remainingBudget.toLocaleString()}</span> daripada RM {SEMESTER_BUDGET.toLocaleString()} tidak akan dibawa ke semester hadapan.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 sm:gap-5 hover:shadow-md transition-shadow">
            <div className={`p-3 ${stat.bg} ${stat.color} rounded-xl`}>
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.title}</p>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts - Hide for students to make it role-specific */}
      {currentUserRole !== 'student' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 font-display tracking-tight">Trend Program Mengikut Kategori</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataKategori}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend iconType="circle" wrapperStyle={{fontSize: '12px', color: '#475569'}} />
                  <Bar dataKey="value" name="Jumlah Program" fill="#2563eb" radius={[4, 4, 4, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 font-display tracking-tight">Status Penggunaan Bajet Keseluruhan</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dataBajet}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dataBajet.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `RM ${Number(value ?? 0).toLocaleString()}`} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px', color: '#475569'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm mt-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 font-display tracking-tight">Senarai Permohonan Terkini</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 px-2 sm:px-4 font-semibold text-slate-500 text-sm">Nama Program</th>
                  <th className="pb-3 px-2 sm:px-4 font-semibold text-slate-500 text-sm">Tarikh</th>
                  <th className="pb-3 px-2 sm:px-4 font-semibold text-slate-500 text-sm">Bajet (RM)</th>
                  <th className="pb-3 px-2 sm:px-4 font-semibold text-slate-500 text-sm">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {applications.slice(0, 5).map((app) => (
                  <tr key={app.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-3 sm:py-4 px-2 sm:px-4 font-medium text-slate-900">{app.title}</td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-slate-600">
                      {new Date(app.startDate || (app as any).date).toLocaleDateString('ms-MY')}
                      {app.startDate && app.startDate !== app.endDate && ` - ${new Date(app.endDate).toLocaleDateString('ms-MY')}`}
                    </td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4 text-slate-600">{app.budget.toLocaleString()}</td>
                    <td className="py-3 sm:py-4 px-2 sm:px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        app.status === 'Lulus Sepenuhnya' ? 'bg-emerald-100 text-emerald-800' :
                        app.status === 'Ditolak' ? 'bg-red-100 text-red-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">Tiada permohonan terkini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
