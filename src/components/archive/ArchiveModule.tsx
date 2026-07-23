import React, { useState, useEffect, useMemo } from 'react';
import { Archive, Search, Filter, Calendar, FileText, User, Tag } from 'lucide-react';
import { Application } from '../../types';
import { getApplications, getUsers } from '../../services/dataService';
import ApprovalLetterModule from '../approval/ApprovalLetterModule';

import {
  getCurrentAcademicSession,
  getCurrentSemester,
  generateAcademicSessions,
} from '../../utils/dateUtils';

export default function ArchiveModule() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSession, setFilterSession] = useState(getCurrentAcademicSession());
  const [filterSemester, setFilterSemester] = useState(getCurrentSemester());
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showApprovalLetter, setShowApprovalLetter] = useState(false);

  const academicSessions = generateAcademicSessions(5);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appsData, usersData] = await Promise.all([getApplications('admin', ''), getUsers()]);
      // Only show fully approved applications
      const approved = appsData.filter((app) => app.status === 'Lulus Sepenuhnya');
      setApplications(approved);

      const uMap: Record<string, string> = {};
      usersData.forEach((u) => {
        uMap[u.uid] = (u as any).displayName || u.name;
      });
      setUsersMap(uMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPrograms = useMemo(() => {
    return applications.filter((app) => {
      const applicantName = usersMap[app.applicantId] || '';
      const matchesSearch =
        app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        applicantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSession = filterSession ? app.academicSession === filterSession : true;
      const matchesSemester = filterSemester ? app.semester === filterSemester : true;

      return matchesSearch && matchesSession && matchesSemester;
    });
  }, [applications, searchTerm, usersMap, filterSession, filterSemester]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showApprovalLetter && selectedApp && (
        <div className="space-y-6">
          <ApprovalLetterModule
            applicationId={selectedApp.id}
            onBack={() => setShowApprovalLetter(false)}
          />
        </div>
      )}

      {!showApprovalLetter && (
        <>
          <div>
            <h2 className="text-3xl font-bold text-slate-900 font-display tracking-tight">
              Kertas Kerja yang Diluluskan
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              Senarai lengkap permohonan kertas kerja yang telah mendapat kelulusan sepenuhnya.
            </p>
          </div>

          {/* Search and Filter Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Filter className="w-5 h-5 text-slate-400" />
              <h3 className="font-semibold text-slate-700">Tapis Senarai</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari program, penganjur, atau ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                />
              </div>

              <select
                value={filterSession}
                onChange={(e) => setFilterSession(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                <option value="">Semua Sesi Akademik</option>
                {academicSessions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>

              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
              >
                <option value="">Semua Semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Program List */}
      {!showApprovalLetter && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    ID Program
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Nama Program
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Pemohon
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Tarikh Program
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Sesi
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold text-center">
                    Status Akhir
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right">
                    Tindakan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPrograms.length > 0 ? (
                  filteredPrograms.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                        {app.id}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">{app.title}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          {usersMap[app.applicantId] || 'Tiada Rekod'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(app.startDate || (app as any).date).toLocaleDateString('ms-MY')}
                          {app.startDate &&
                            app.startDate !== app.endDate &&
                            ` - ${new Date(app.endDate).toLocaleDateString('ms-MY')}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          <Tag className="w-3 h-3" /> {app.academicSession}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            app.status === 'Lulus Sepenuhnya'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : app.status === 'Ditolak'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : app.status === 'Dibatalkan'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setShowApprovalLetter(true);
                            }}
                            className="flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 font-medium text-xs transition-colors bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100"
                          >
                            <FileText className="w-3.5 h-3.5" /> Surat
                          </button>
                          <button className="text-blue-600 hover:text-blue-800 font-medium text-xs transition-colors bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100">
                            Butiran
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center">
                        <Archive className="w-12 h-12 mb-3 text-slate-200" />
                        <p>Tiada program diarkibkan ditemui.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination (Mock) */}
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Menunjukkan{' '}
              <span className="font-semibold text-slate-900">1-{filteredPrograms.length}</span>{' '}
              daripada{' '}
              <span className="font-semibold text-slate-900">{filteredPrograms.length}</span> rekod
            </span>
            <div className="flex gap-2">
              <button
                disabled
                className="px-3 py-1 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded-lg cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                disabled
                className="px-3 py-1 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded-lg cursor-not-allowed"
              >
                Seterusnya
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
