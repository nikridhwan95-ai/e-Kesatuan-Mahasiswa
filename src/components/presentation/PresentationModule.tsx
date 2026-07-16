import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle, FileText, MessageSquare, Settings } from 'lucide-react';
import { UserRole, Application, PresentationSession } from '../../types';
import PresentationSessionManager from './PresentationSessionManager';
import { getApplications, updateApplication, getPresentationSessions, createPresentationSession, updatePresentationSessionStatus, updateApplicationPresentation, getUsers, updateApplicationStatus, deletePresentationSession } from '../../services/firestoreService';

interface PresentationModuleProps {
  currentUserRole: UserRole;
  applicantId?: string;
}

export default function PresentationModule({ currentUserRole, applicantId }: PresentationModuleProps) {
  const isReviewer = currentUserRole === 'unit_pembentangan' || currentUserRole === 'admin';
  const isAdmin = currentUserRole === 'admin';

  const [activeTab, setActiveTab] = useState<'list' | 'sessions'>('list');
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [comment, setComment] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number | ''>('');
  const [presentationSessionId, setPresentationSessionId] = useState('');
  const [presentationRoom, setPresentationRoom] = useState<number>(1);
  
  const [sessions, setSessions] = useState<PresentationSession[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [currentUserRole, applicantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsData, sessionsData, usersData] = await Promise.all([
        getApplications(currentUserRole, applicantId || ''),
        getPresentationSessions(),
        getUsers()
      ]);
      setApplications(appsData);
      setSessions(sessionsData);
      
      const uMap: Record<string, string> = {};
      usersData.forEach(u => {
        uMap[u.uid] = (u as any).displayName || u.name;
      });
      setUsersMap(uMap);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSession = async (session: PresentationSession) => {
    try {
      const { id, ...sessionData } = session;
      const newId = await createPresentationSession(sessionData);
      setSessions([...sessions, { ...session, id: newId }]);
    } catch (error) {
      console.error("Error adding session:", error);
      alert("Gagal menambah sesi.");
    }
  };

  const handleToggleSessionStatus = async (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    
    const newStatus = session.status === 'Open' ? 'Closed' : 'Open';
    try {
      await updatePresentationSessionStatus(id, newStatus);
      setSessions(sessions.map(s => 
        s.id === id ? { ...s, status: newStatus } : s
      ));
    } catch (error) {
      console.error("Error updating session status:", error);
      alert("Gagal mengemaskini status sesi.");
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await deletePresentationSession(id);
      setSessions(sessions.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error deleting session:", error);
      alert("Gagal memadam sesi.");
    }
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    const selectedSession = sessions.find(s => s.id === presentationSessionId);
    if (!selectedSession) {
      alert("Sila pilih sesi semakan.");
      return;
    }

    try {
      await updateApplicationPresentation(selectedApp.id, presentationSessionId, selectedSession.date, presentationRoom);
      
      const updatedApps = applications.map(app => 
        app.id === selectedApp.id 
          ? { ...app, presentationDate: selectedSession.date, presentationSessionId, presentationRoom, status: 'Menunggu Pembentangan' as const } 
          : app
      );
      setApplications(updatedApps);
      setSelectedApp({ ...selectedApp, presentationDate: selectedSession.date, presentationSessionId, presentationRoom, status: 'Menunggu Pembentangan' });
      alert('Jadual semakan berjaya ditetapkan!');
    } catch (error) {
      console.error("Error scheduling presentation:", error);
      alert("Gagal menetapkan jadual.");
    }
  };

  const handleDecision = async (decision: 'Menunggu Kelulusan YDP' | 'Perlu Pembetulan' | 'Ditolak') => {
    if (!comment.trim() && decision !== 'Menunggu Kelulusan YDP') {
      alert('Sila masukkan komen sebelum membuat keputusan.');
      return;
    }

    if (decision === 'Menunggu Kelulusan YDP' && (approvedAmount === '' || approvedAmount < 0)) {
      alert('Sila masukkan jumlah kewangan yang diluluskan.');
      return;
    }

    if (!selectedApp) return;

    try {
      const finalApprovedAmount = decision === 'Menunggu Kelulusan YDP' ? Number(approvedAmount) : undefined;
      await updateApplicationStatus(selectedApp.id, decision, comment, finalApprovedAmount);

      const updatedApps = applications.map(app => 
        app.id === selectedApp.id 
          ? { ...app, status: decision, approvedAmount: finalApprovedAmount } 
          : app
      );
      setApplications(updatedApps);
      setSelectedApp(null);
      setComment('');
      setApprovedAmount('');
      alert('Keputusan berjaya direkodkan!');
    } catch (error) {
      console.error("Error recording decision:", error);
      alert("Gagal merekod keputusan.");
    }
  };

  // Filter apps to show only those relevant for presentation
  const displayApps = applications.filter(app => 
    app.status === 'Menunggu Pembentangan' || 
    app.status === 'Menunggu Kelulusan YDP' || 
    app.status === 'Menunggu Kelulusan TNC HEPA' || 
    app.status === 'Perlu Pembetulan' || 
    app.status === 'Lulus Sepenuhnya' || 
    app.status === 'Ditolak'
  );

  const getSessionName = (sessionId?: string) => {
    if (!sessionId) return '';
    const session = sessions.find(s => s.id === sessionId);
    return session ? session.name : sessionId;
  };

  const getPresentationStatusBadge = (app: Application) => {
    if (app.status === 'Menunggu Pembentangan') {
      if (app.presentationDate) {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">Telah Dijadualkan</span>;
      } else {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-amber-50 text-amber-700 border-amber-200">Menunggu Jadual</span>;
      }
    } else if (app.status === 'Menunggu Kelulusan YDP') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">Menunggu Kelulusan YDP</span>;
    } else if (app.status === 'Menunggu Kelulusan TNC HEPA') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200">Menunggu Kelulusan TNC HEPA</span>;
    } else if (app.status === 'Perlu Pembetulan') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-yellow-100 text-yellow-800 border-yellow-300">Perlu Pembetulan</span>;
    } else if (app.status === 'Lulus Sepenuhnya') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">Lulus Sepenuhnya</span>;
    } else if (app.status === 'Ditolak') {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-red-50 text-red-700 border-red-200">Ditolak</span>;
    } else {
      return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-slate-50 text-slate-700 border-slate-200">{app.status}</span>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
            {isReviewer ? 'Sesi Semakan KM' : 'Jadual Semakan'}
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            {isReviewer 
              ? 'Urus jadual semakan dan rekod keputusan kertas kerja.' 
              : 'Lihat jadual semakan yang telah ditetapkan oleh Kesatuan Mahasiswa.'}
          </p>
        </div>
        
        {isReviewer && (
          <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Senarai Permohonan
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'sessions' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" /> Pengurusan Sesi Semakan
            </button>
          </div>
        )}
      </div>

      {activeTab === 'sessions' ? (
        <PresentationSessionManager 
          sessions={sessions} 
          onAddSession={handleAddSession} 
          onToggleStatus={handleToggleSessionStatus} 
          onDeleteSession={handleDeleteSession}
        />
      ) : (
        <>
          {isReviewer && !selectedApp ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="p-4">ID Permohonan</th>
                      <th className="p-4">Pemohon</th>
                      <th className="p-4">Nama Program</th>
                      <th className="p-4">Tarikh Program</th>
                      <th className="p-4">Tarikh Semakan</th>
                      <th className="p-4">Status Jadual</th>
                      <th className="p-4 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayApps.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-sm font-medium text-slate-600">{app.id}</td>
                        <td className="p-4 text-sm font-medium text-slate-600">{usersMap[app.applicantId] || 'Tiada Rekod'}</td>
                        <td className="p-4 text-sm font-semibold text-slate-900">{app.title}</td>
                        <td className="p-4 text-sm text-slate-600">
                          {new Date(app.startDate || (app as any).date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {app.startDate && app.startDate !== app.endDate && ` - ${new Date(app.endDate).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                        </td>
                        <td className="p-4 text-sm font-medium">
                          {app.presentationDate ? (
                            <span className="text-blue-700 flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {new Date(app.presentationDate).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {app.presentationRoom && (
                                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  Bilik {app.presentationRoom}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Belum dijadualkan</span>
                          )}
                        </td>
                        <td className="p-4">
                          {getPresentationStatusBadge(app)}
                        </td>
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => {
                              setSelectedApp(app);
                              setPresentationSessionId(app.presentationSessionId || '');
                              setPresentationRoom(app.presentationRoom || 1);
                              setComment('');
                              setApprovedAmount(app.approvedAmount || '');
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                          >
                            Urus
                          </button>
                        </td>
                      </tr>
                    ))}
                    {displayApps.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-400 text-sm">
                          Tiada permohonan untuk semakan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* List of Presentations (Sidebar) */}
              <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[400px] sm:h-[600px]">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-bold text-slate-900 font-display">Senarai Semakan</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {displayApps.map((app) => (
                    <div 
                      key={app.id} 
                      onClick={() => {
                        setSelectedApp(app);
                        setPresentationSessionId(app.presentationSessionId || '');
                        setPresentationRoom(app.presentationRoom || 1);
                        setComment('');
                        setApprovedAmount(app.approvedAmount || '');
                      }}
                      className={`p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                        selectedApp?.id === app.id 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-slate-500">{usersMap[app.applicantId] || 'Tiada Rekod'}</span>
                        {getPresentationStatusBadge(app)}
                      </div>
                      <h4 className={`font-semibold text-sm leading-tight ${selectedApp?.id === app.id ? 'text-blue-900' : 'text-slate-900'}`}>{app.title}</h4>
                      {app.presentationDate && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-600 bg-slate-100 p-2 rounded-lg">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(app.presentationDate).toLocaleDateString()} ({getSessionName(app.presentationSessionId)}) {app.presentationRoom ? `- Bilik ${app.presentationRoom}` : ''}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {displayApps.length === 0 && (
                    <div className="text-center p-6 text-slate-400 text-sm">
                      Tiada permohonan untuk semakan.
                    </div>
                  )}
                </div>
              </div>

              {/* Details and Actions */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-8 h-auto sm:h-[600px] overflow-y-auto">
                {selectedApp ? (
                  <div className="space-y-8">
                    <div>
                      {isReviewer && (
                        <button 
                          onClick={() => setSelectedApp(null)}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1"
                        >
                          &larr; Kembali ke Senarai
                        </button>
                      )}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold tracking-wide border border-blue-200">
                          {selectedApp.id}
                        </span>
                        <span className="text-sm text-slate-500 font-medium">{selectedApp.status}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight leading-tight">
                        {selectedApp.title}
                      </h3>
                    </div>

                    {/* View Paper */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 text-sm">Kertas Kerja Permohonan</h4>
                          <p className="text-xs text-slate-500">Sila semak sebelum sesi semakan</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => window.open(selectedApp.paperUrl, '_blank')}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
                      >
                        Lihat Dokumen
                      </button>
                    </div>

                    {/* Scheduling Form or Decision Panel */}
                    {!selectedApp.presentationDate ? (
                      // Scheduling Form
                      <div className="border border-slate-200 rounded-2xl overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center gap-2">
                          <Clock className="w-5 h-5 text-slate-600" />
                          <h4 className="font-bold text-slate-900">Tetapkan Jadual Semakan</h4>
                        </div>
                        <form onSubmit={handleSchedule} className="p-5 space-y-5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Sesi Semakan</label>
                              <select 
                                required
                                disabled={!isReviewer}
                                value={presentationSessionId}
                                onChange={(e) => setPresentationSessionId(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-100 disabled:text-slate-500"
                              >
                                <option value="">Pilih Sesi</option>
                                {sessions.filter(s => s.status === 'Open').map(session => (
                                  <option key={session.id} value={session.id}>{session.name} ({session.date} {session.time})</option>
                                ))}
                              </select>
                            </div>
                            {presentationSessionId && (
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Bilik Semakan</label>
                                <select 
                                  required
                                  disabled={!isReviewer}
                                  value={presentationRoom}
                                  onChange={(e) => setPresentationRoom(parseInt(e.target.value))}
                                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow disabled:bg-slate-100 disabled:text-slate-500"
                                >
                                  {Array.from({ length: sessions.find(s => s.id === presentationSessionId)?.roomCount || 1 }).map((_, i) => (
                                    <option key={i + 1} value={i + 1}>Bilik {i + 1}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                          {isReviewer && (
                            <div className="flex justify-end pt-2">
                              <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">
                                Simpan Jadual
                              </button>
                            </div>
                          )}
                        </form>
                      </div>
                    ) : (
                      // Decision Panel
                      <div className="space-y-6">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start gap-4">
                          <Calendar className="w-6 h-6 text-emerald-600 shrink-0" />
                          <div>
                            <h4 className="font-bold text-emerald-900">Jadual Telah Ditetapkan</h4>
                            <p className="text-sm text-emerald-800 mt-1">
                              Dijadualkan pada: <span className="font-semibold">{selectedApp.presentationDate} ({getSessionName(selectedApp.presentationSessionId)})</span>
                              {selectedApp.presentationRoom && (
                                <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">
                                  Bilik {selectedApp.presentationRoom}
                                </span>
                              )}
                            </p>
                            {sessions.find(s => s.id === selectedApp.presentationSessionId)?.link && (
                              <p className="mt-2 text-sm">
                                <a href={sessions.find(s => s.id === selectedApp.presentationSessionId)?.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">
                                  Pautan Bilik Semakan
                                </a>
                              </p>
                            )}
                          </div>
                        </div>

                        {isReviewer && (selectedApp.status === 'Menunggu Pembentangan') && (
                          <div className="border border-slate-200 rounded-2xl p-6 space-y-6">
                            <h4 className="font-bold text-slate-900 font-display text-lg">Keputusan Semakan</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4" /> Ulasan / Komen (Wajib)
                                </label>
                                <textarea 
                                  value={comment}
                                  onChange={(e) => setComment(e.target.value)}
                                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                                  rows={4} 
                                  placeholder="Masukkan ulasan semakan atau sebab penolakan/pembetulan..."
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Jumlah Kewangan Diluluskan (RM)</label>
                                <input 
                                  type="number" 
                                  value={approvedAmount}
                                  onChange={(e) => setApprovedAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" 
                                  placeholder="0.00"
                                />
                                <p className="text-xs text-slate-500 mt-1 italic">Bajet dimohon: RM {selectedApp.budget.toLocaleString()}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <button 
                                onClick={() => handleDecision('Ditolak')}
                                className="px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-semibold hover:bg-red-100 transition-colors flex flex-col items-center justify-center gap-1 text-sm"
                              >
                                <XCircle className="w-5 h-5 mb-1" />
                                Tolak (Gagal)
                              </button>
                              <button 
                                onClick={() => handleDecision('Perlu Pembetulan')}
                                className="px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-semibold hover:bg-amber-100 transition-colors flex flex-col items-center justify-center gap-1 text-sm"
                              >
                                <AlertCircle className="w-5 h-5 mb-1" />
                                Perlu Pembaikan
                              </button>
                              <button 
                                onClick={() => handleDecision('Menunggu Kelulusan YDP')}
                                className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20 flex flex-col items-center justify-center gap-1 text-sm"
                              >
                                <CheckCircle className="w-5 h-5 mb-1" />
                                Lulus (Ke YDP)
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedApp.status !== 'Menunggu Pembentangan' && (
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                            <p className="text-slate-600 font-medium">Keputusan telah direkodkan: <span className="font-bold text-slate-900">{selectedApp.status}</span></p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Clock className="w-16 h-16 mb-4 text-slate-200" />
                    <p className="font-medium text-slate-600">Pilih permohonan di sebelah kiri</p>
                    <p className="text-sm mt-1">
                      {isReviewer ? 'Untuk menetapkan jadual atau merekod keputusan semakan.' : 'Untuk melihat butiran jadual semakan.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
