import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, ArrowUpDown, FileText, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { Application, UserRole, ApplicationStatus } from '../../types';
import ApprovalWorkflow from '../approval/ApprovalWorkflow';
import ApprovalLetterModule from '../approval/ApprovalLetterModule';
import { getApplications, updateApplicationStatus, getUsers } from '../../services/dataService';

interface ReviewModuleProps {
  currentUserRole: UserRole;
}

type SortField = 'createdAt' | 'title' | 'budget' | 'status';
type SortOrder = 'asc' | 'desc';

import { getCurrentAcademicSession, getCurrentSemester, generateAcademicSessions } from '../../utils/dateUtils';

export default function ReviewModule({ currentUserRole }: ReviewModuleProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSession, setFilterSession] = useState(getCurrentAcademicSession());
  const [filterSemester, setFilterSemester] = useState(getCurrentSemester());
  const [filterStatus, setFilterStatus] = useState('');
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const academicSessions = generateAcademicSessions(5);

  useEffect(() => {
    fetchData();
  }, [currentUserRole]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsData, usersData] = await Promise.all([
        getApplications(currentUserRole, ''),
        getUsers()
      ]);
      setApplications(appsData);
      
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

  const fetchApplications = async () => {
    try {
      const data = await getApplications(currentUserRole, '');
      setApplications(data);
    } catch (error) {
      console.error("Error fetching applications:", error);
    }
  };

  // Extract unique values for filters
  const statuses = Array.from(new Set(applications.map(app => app.status)));

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedApps = useMemo(() => {
    let result = [...applications];

    // Apply filters
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(app => 
        app.title.toLowerCase().includes(lowerQuery) || 
        app.id.toLowerCase().includes(lowerQuery)
      );
    }
    if (filterSession) {
      result = result.filter(app => app.academicSession === filterSession);
    }
    if (filterSemester) {
      result = result.filter(app => app.semester === filterSemester);
    }
    if (filterStatus) {
      result = result.filter(app => app.status === filterStatus);
    }

    // Apply sorting
    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'budget') {
        valA = Number(valA);
        valB = Number(valB);
      } else if (sortField === 'createdAt') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else {
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [applications, searchQuery, filterSession, filterSemester, filterStatus, sortField, sortOrder]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Menunggu Semakan':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Menunggu Semakan</span>;
      case 'Perlu Pembetulan':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">Perlu Pembetulan</span>;
      case 'Menunggu Kelulusan TNC HEPA':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Menunggu Kelulusan TNC HEPA</span>;
      case 'Lulus Sepenuhnya':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Lulus Sepenuhnya</span>;
      case 'Ditolak':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">Ditolak</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
    }
  };

  // Handlers for ApprovalWorkflow
  const handleApprove = async (id: string, comments?: string, approvedAmount?: number) => {
    let nextStatus: ApplicationStatus = selectedApp?.status as ApplicationStatus;

    if (selectedApp?.status === 'Menunggu Semakan') {
      nextStatus = 'Menunggu Pembentangan';
    } else if (selectedApp?.status === 'Menunggu Pembentangan') {
      nextStatus = 'Menunggu Kelulusan YDP';
    } else if (selectedApp?.status === 'Menunggu Kelulusan YDP') {
      nextStatus = 'Menunggu Kelulusan TNC HEPA';
    } else if (selectedApp?.status === 'Menunggu Kelulusan TNC HEPA') {
      nextStatus = 'Lulus Sepenuhnya';
    } else if (selectedApp?.status === 'Menunggu Semakan Pindaan') {
      nextStatus = 'Menunggu Kelulusan YDP (Pindaan)';
    } else if (selectedApp?.status === 'Menunggu Kelulusan YDP (Pindaan)') {
      nextStatus = 'Lulus Sepenuhnya';
    }

    try {
      await updateApplicationStatus(id, nextStatus, comments, approvedAmount);
      showNotification(`Permohonan berjaya disokong/diluluskan.`, 'success');
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error("Error updating status:", error);
      showNotification("Gagal mengemaskini status.", 'error');
    }
  };

  const handleReject = async (id: string, comments?: string) => {
    try {
      await updateApplicationStatus(id, 'Ditolak', comments);
      showNotification(`Permohonan telah ditolak.`, 'success');
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error("Error rejecting application:", error);
      showNotification("Gagal menolak permohonan.", 'error');
    }
  };

  const handleRequestRevision = async (id: string, comments: string) => {
    try {
      await updateApplicationStatus(id, 'Perlu Pembetulan', comments);
      showNotification(`Permohonan telah diminta untuk pembetulan.`, 'success');
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error("Error requesting revision:", error);
      showNotification("Gagal meminta pembetulan.", 'error');
    }
  };

  // TODO Fasa 6: PEPIJAT — tarikh yang dipilih pentadbir dibuang; mesti
  // disimpan melalui updateApplicationPresentation.
  const handleSchedulePresentation = async (id: string, _date: string) => {
    // This is handled in PresentationModule usually, but if called here:
    try {
      await updateApplicationStatus(id, 'Menunggu Pembentangan');
      showNotification(`Sesi semakan telah dijadualkan.`, 'success');
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error("Error scheduling presentation:", error);
      showNotification("Gagal menjadualkan semakan.", 'error');
    }
  };

  const getModuleTitle = () => {
    switch (currentUserRole) {
      case 'unit_semakan': return 'Semakan Kertas Kerja';
      case 'unit_kertas_kerja': return 'Semakan Pindaan Kertas Kerja';
      case 'ydp': return 'Kelulusan YDP MPP';
      case 'admin': return 'Pengurusan Kelulusan';
      default: return 'Modul Kelulusan';
    }
  };

  const getModuleDescription = () => {
    switch (currentUserRole) {
      case 'unit_semakan': return 'Semak permohonan awal sebelum sesi semakan.';
      case 'unit_kertas_kerja': return 'Urus dan semak semua permohonan kertas kerja mengikut sesi akademik dan semester.';
      case 'ydp': return 'Pengesahan permohonan kertas kerja sebelum kelulusan akhir.';
      case 'admin': return 'Pantau dan urus semua aliran kelulusan kertas kerja.';
      default: return 'Urus permohonan kertas kerja.';
    }
  };

  const [showApprovalLetter, setShowApprovalLetter] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showApprovalLetter && selectedApp) {
    return (
      <div className="space-y-6">
        <ApprovalLetterModule 
          applicationId={selectedApp.id} 
          onBack={() => setShowApprovalLetter(false)} 
        />
      </div>
    );
  }

  if (selectedApp) {
    return (
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button 
            onClick={() => setSelectedApp(null)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1"
          >
            &larr; Kembali ke Senarai
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">Butiran {getModuleTitle()}</h2>
          <p className="text-sm text-slate-500 mt-1">Sila semak maklumat permohonan dan berikan keputusan.</p>
        </div>
      </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tajuk Program</h3>
            <p className="text-lg font-semibold text-slate-900 mt-1">{selectedApp.title}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bajet Dimohon</h3>
            <p className="text-lg font-bold text-blue-600 mt-1">RM {selectedApp.budget.toLocaleString()}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tarikh Program</h3>
            <p className="text-sm font-medium text-slate-900 mt-1">
              {new Date(selectedApp.startDate || (selectedApp as any).date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
              {selectedApp.startDate && selectedApp.startDate !== selectedApp.endDate && ` - ${new Date(selectedApp.endDate).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pemohon</h3>
            <p className="text-sm font-medium text-slate-900 mt-1">{usersMap[selectedApp.applicantId] || 'Tiada Rekod'}</p>
          </div>
          <div className="col-span-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Objektif</h3>
            <p className="text-slate-700 mt-1 leading-relaxed text-sm">{selectedApp.objective}</p>
          </div>
          <div className="col-span-2 flex gap-4 mt-2">
             <a 
               href={selectedApp.paperUrl}
               target="_blank"
               rel="noopener noreferrer"
               className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline font-medium text-sm bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
             >
               <FileText className="w-4 h-4"/> Lihat Kertas Kerja
             </a>
             {selectedApp.status === 'Lulus Sepenuhnya' && (
               <button 
                 onClick={() => setShowApprovalLetter(true)}
                 className="flex items-center gap-2 text-emerald-600 hover:text-emerald-800 hover:underline font-medium text-sm bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
               >
                 <FileText className="w-4 h-4"/> Lihat Surat Kelulusan
               </button>
             )}
          </div>
        </div>

        <ApprovalWorkflow 
          application={selectedApp}
          currentUserRole={currentUserRole}
          onApprove={handleApprove}
          onReject={handleReject}
          onRequestRevision={handleRequestRevision}
          onSchedulePresentation={handleSchedulePresentation}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">{getModuleTitle()}</h2>
        <p className="text-sm text-slate-500 mt-1.5">{getModuleDescription()}</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-700">Tapis Senarai</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="relative lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari ID atau Tajuk..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
          </div>
          
          <select 
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Semua Sesi Akademik</option>
            {academicSessions.map(session => (
              <option key={session} value={session}>{session}</option>
            ))}
          </select>

          <select 
            value={filterSemester}
            onChange={(e) => setFilterSemester(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Semua Semester</option>
            <option value="1">Semester 1</option>
            <option value="2">Semester 2</option>
          </select>

          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Semua Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-1">
                    Tarikh Mohon {sortField === 'createdAt' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-1">
                    ID & Tajuk Program {sortField === 'title' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
                <th className="p-4">Sesi Akademik</th>
                <th className="p-4">Semester</th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('budget')}>
                  <div className="flex items-center gap-1">
                    Bajet (RM) {sortField === 'budget' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">
                    Status {sortField === 'status' && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
                <th className="p-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSortedApps.length > 0 ? (
                filteredAndSortedApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                      {app.createdAt ? new Date(app.createdAt).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-400 mb-0.5">{app.id}</span>
                        <span className="text-sm font-semibold text-slate-900 line-clamp-2">{app.title}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{app.academicSession || '-'}</td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{app.semester ? `Sem ${app.semester}` : '-'}</td>
                    <td className="p-4 text-sm font-bold text-slate-700 whitespace-nowrap">
                      {app.budget.toLocaleString()}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => setSelectedApp(app)}
                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded-lg transition-colors border border-transparent hover:border-blue-200"
                        title="Lihat Butiran"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-600">Tiada permohonan dijumpai</p>
                      <p className="text-sm mt-1">Sila ubah kriteria tapisan anda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination (Mock) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-sm text-slate-600">
          <span>Memaparkan {filteredAndSortedApps.length} daripada {applications.length} permohonan</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50" disabled>Sebelumnya</button>
            <button className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-white disabled:opacity-50" disabled>Seterusnya</button>
          </div>
        </div>
      </div>
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-600" />
          )}
          <p className="font-bold text-sm">{notification.message}</p>
        </div>
      )}
    </div>
  );
}
