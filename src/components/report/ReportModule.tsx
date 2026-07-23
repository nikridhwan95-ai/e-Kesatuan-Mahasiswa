import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  AlertCircle,
  FileText,
  XCircle,
  Search,
  DollarSign,
  Clock,
  Calendar,
  User,
} from 'lucide-react';
import { UserRole, Application, Report } from '../../types';
import {
  getApplications,
  getReports,
  createReport,
  updateReportStatus,
  uploadFile,
  getUsers,
} from '../../services/dataService';
import { syncEvidenceForApplication } from '../../bakat/evidenceService';
import FileLink from '../shared/FileLink';
import StatusBadge from '../shared/StatusBadge';
import { useNotification } from '../shared/ToastProvider';

interface ReportModuleProps {
  currentUserRole: UserRole;
  applicantId: string;
}

import {
  getCurrentAcademicSession,
  getCurrentSemester,
  generateAcademicSessions,
} from '../../utils/dateUtils';

export default function ReportModule({ currentUserRole, applicantId }: ReportModuleProps) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showNotification } = useNotification();
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [unionBudgetUsed, setUnionBudgetUsed] = useState<string>('');
  const [participantCount, setParticipantCount] = useState<string>('');
  const [reviewerComment, setReviewerComment] = useState('');
  const [verifiedBudget, setVerifiedBudget] = useState<string>('');
  const [filterSession, setFilterSession] = useState(getCurrentAcademicSession());
  const [filterSemester, setFilterSemester] = useState(getCurrentSemester());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const isStudent = currentUserRole === 'student';

  const academicSessions = generateAcademicSessions(5);

  useEffect(() => {
    fetchData();
  }, [currentUserRole, applicantId]);

  const fetchData = async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const [appsData, reportsData, usersData] = await Promise.all([
        getApplications(currentUserRole, applicantId),
        getReports(currentUserRole, applicantId),
        getUsers(),
      ]);
      setApplications(appsData);
      setReports(reportsData);

      const uMap: Record<string, string> = {};
      usersData.forEach((u) => {
        uMap[u.uid] = (u as any).displayName || u.name;
      });
      setUsersMap(uMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  // Combine applications and reports
  const reportList = applications
    .filter((app) => app.status === 'Lulus Sepenuhnya')
    .map((app) => {
      const report = reports.find((r) => r.applicationId === app.id);
      return {
        app,
        report,
        status: report ? report.status : 'Tertunggak',
      };
    });

  // For reviewers, we might want to see all reports, even if we don't fetch all applications (depending on getApplications implementation)
  // But getApplications fetches all for non-students.
  // However, getReports also fetches all for non-students.
  // So reportList should be correct.

  const displayedReports = reportList.filter((item) => {
    const matchesSession = filterSession ? item.app.academicSession === filterSession : true;
    const matchesSemester = filterSemester ? item.app.semester === filterSemester : true;
    const q = searchQuery.trim().toLowerCase();
    const applicantName = (usersMap[item.app.applicantId] || '').toLowerCase();
    const matchesSearch = q
      ? item.app.title.toLowerCase().includes(q) ||
        item.app.id.toLowerCase().includes(q) ||
        applicantName.includes(q)
      : true;
    const matchesStatus = filterStatus ? item.status === filterStatus : true;
    return matchesSession && matchesSemester && matchesSearch && matchesStatus;
  });

  const handleCreateReport = async () => {
    if (!selectedAppId) return;
    setSubmitting(true);
    try {
      let reportUrl = '';
      let receiptUrl = '';

      if (reportFile) {
        const path = `reports/${applicantId}/${selectedAppId}_report_${Date.now()}_${reportFile.name}`;
        reportUrl = await uploadFile(path, reportFile);
      }

      if (receiptFile) {
        const path = `reports/${applicantId}/${selectedAppId}_receipt_${Date.now()}_${receiptFile.name}`;
        receiptUrl = await uploadFile(path, receiptFile);
      }

      await createReport({
        applicationId: selectedAppId,
        applicantId: applicantId,
        status: 'Dihantar',
        reportUrl,
        receiptUrl,
        unionBudgetUsed: parseFloat(unionBudgetUsed) || 0,
        participantCount: parseInt(participantCount) || 0,
      });
      showNotification('Laporan berjaya dihantar!', 'success');
      setSelectedAppId(null);
      setReportFile(null);
      setReceiptFile(null);
      setUnionBudgetUsed('');
      setParticipantCount('');
      fetchData();
    } catch (error) {
      console.error('Error creating report:', error);
      showNotification('Gagal menghantar laporan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (status: 'Disahkan' | 'Perlu Pembetulan') => {
    const selectedReportItem = reportList.find((item) => item.app.id === selectedAppId);
    if (!selectedReportItem || !selectedReportItem.report) {
      console.warn('No report found to update');
      return;
    }

    setSubmitting(true);
    try {
      const additionalData: Partial<Report> = {};
      if (status === 'Disahkan') {
        additionalData.verifiedBudgetUsed = parseFloat(verifiedBudget) || 0;
      }

      await updateReportStatus(
        selectedReportItem.report.id,
        status,
        reviewerComment,
        additionalData,
      );

      // Integrasi Modul Bakat: laporan yang disahkan melengkapkan kitaran
      // program → jana bukti bakat pelajar secara automatik (idempotent).
      if (status === 'Disahkan') {
        try {
          const created = await syncEvidenceForApplication(selectedReportItem.app, {
            ...selectedReportItem.report,
            ...additionalData,
            status: 'Disahkan',
            reviewedAt: new Date().toISOString(),
          });
          if (created > 0) {
            showNotification(
              `Laporan Disahkan! ${created} bukti bakat dijana untuk profil pelajar.`,
              'success',
            );
          } else {
            showNotification('Laporan Disahkan!', 'success');
          }
        } catch (evidenceError) {
          console.error('Error generating talent evidence:', evidenceError);
          showNotification(
            'Laporan Disahkan! (Bukti bakat gagal dijana — guna Jana Bukti di Radar Bakat.)',
            'success',
          );
        }
      } else {
        showNotification(`Laporan ${status}!`, 'success');
      }
      setSelectedAppId(null);
      setReviewerComment('');
      setVerifiedBudget('');
      fetchData();
    } catch (error) {
      console.error('Error updating report status:', error);
      showNotification('Gagal mengemaskini status laporan.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedItem = reportList.find((item) => item.app.id === selectedAppId);

  // Bergantung pada laporan yang dipilih (bukan hanya ID) supaya nilai bajet
  // disegarkan apabila senarai laporan dimuat semula.
  useEffect(() => {
    if (selectedItem?.report) {
      setVerifiedBudget(
        selectedItem.report.verifiedBudgetUsed?.toString() ||
          selectedItem.report.unionBudgetUsed?.toString() ||
          '',
      );
    } else {
      setVerifiedBudget('');
    }
  }, [selectedItem?.report]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-3xl font-bold text-slate-900 font-display tracking-tight">
            {isStudent ? 'Pelaporan Pascaprogram' : 'Semakan Laporan Program'}
          </h2>
          <p className="text-[10px] sm:text-sm text-slate-500 mt-1 sm:mt-1.5">
            {isStudent
              ? 'Muat naik laporan akhir dan resit kewangan sahaja. (Maksimum 5MB setiap fail)'
              : 'Semak dan sahkan laporan akhir yang dihantar oleh pelajar.'}
          </p>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-red-800">
            Gagal memuatkan data. Sila semak sambungan anda.
          </p>
          <button
            onClick={fetchData}
            className="shrink-0 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Cuba Semula
          </button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      )}

      {!isStudent && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari laporan, nama pelajar atau ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <select
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              <option value="">Semua Sesi</option>
              {academicSessions.map((session) => (
                <option key={session} value={session}>
                  Sesi {session}
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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              <option value="">Semua Status</option>
              <option value="Tertunggak">Tertunggak</option>
              <option value="Dihantar">Dihantar</option>
              <option value="Disahkan">Disahkan</option>
              <option value="Perlu Pembetulan">Perlu Pembetulan</option>
            </select>
          </div>
        </div>
      )}

      {!isStudent && !selectedAppId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Mobile View: Cards */}
          <div className="block lg:hidden divide-y divide-slate-100">
            {displayedReports.map((item) => (
              <div
                key={item.app.id}
                className="p-4 space-y-4 hover:bg-slate-50 transition-colors"
                onClick={() => setSelectedAppId(item.app.id)}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{item.app.title}</h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                      ID Laporan: {item.report?.id || '-'}
                    </p>
                  </div>
                  <StatusBadge status={item.status} className="shrink-0" />
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="font-medium">
                      {new Date(item.app.startDate || (item.app as any).date).toLocaleDateString(
                        'ms-MY',
                        { day: 'numeric', month: 'short', year: 'numeric' },
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-medium truncate">
                      {usersMap[item.app.applicantId] || 'Tiada Rekod'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-slate-50">
                  <button className="text-blue-600 text-xs font-bold px-3 py-1.5 bg-blue-50 rounded-lg">
                    Semak Laporan
                  </button>
                </div>
              </div>
            ))}
            {displayedReports.length === 0 && (
              <div className="p-12 text-center text-slate-500 text-sm">
                Tiada laporan untuk disemak.
              </div>
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="p-3 sm:p-4 whitespace-nowrap">ID Laporan</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap">Nama Program</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap">Pemohon</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap">Tarikh Program</th>
                  <th className="p-3 sm:p-4 whitespace-nowrap">Status</th>
                  <th className="p-3 sm:p-4 text-center whitespace-nowrap">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedReports.map((item) => (
                  <tr key={item.app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 sm:p-4 text-xs sm:text-sm font-medium text-slate-600">
                      {item.report?.id || '-'}
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm font-semibold text-slate-900 min-w-[150px]">
                      {item.app.title}
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                      {usersMap[item.app.applicantId] || 'Tiada Rekod'}
                    </td>
                    <td className="p-3 sm:p-4 text-xs sm:text-sm text-slate-600 whitespace-nowrap">
                      {new Date(item.app.startDate || (item.app as any).date).toLocaleDateString(
                        'ms-MY',
                        { day: 'numeric', month: 'short', year: 'numeric' },
                      )}
                    </td>
                    <td className="p-3 sm:p-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-3 sm:p-4 text-center">
                      <button
                        onClick={() => setSelectedAppId(item.app.id)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-xs sm:text-sm hover:underline"
                      >
                        Semak
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedReports.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Tiada laporan untuk disemak.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(isStudent || selectedAppId) && (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* List of Programs needing reports (Only for Student) */}
          {isStudent && (
            <div
              className={`lg:col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-auto lg:h-[600px] ${selectedAppId ? 'hidden lg:flex' : 'flex'}`}
            >
              <div className="p-3 sm:p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 font-display text-xs sm:text-base">
                  Program Selesai
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 max-h-[300px] lg:max-h-none">
                {displayedReports.map((item) => (
                  <div
                    key={item.app.id}
                    onClick={() => setSelectedAppId(item.app.id)}
                    className={`p-3 sm:p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                      selectedAppId === item.app.id
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1 sm:mb-2">
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">
                        {item.app.id}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <h4
                      className={`font-semibold text-[11px] sm:text-sm leading-tight ${selectedAppId === item.app.id ? 'text-blue-900' : 'text-slate-900'}`}
                    >
                      {item.app.title}
                    </h4>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 font-medium">
                      {new Date(item.app.startDate || (item.app as any).date).toLocaleDateString(
                        'ms-MY',
                        { day: 'numeric', month: 'short', year: 'numeric' },
                      )}
                    </p>
                  </div>
                ))}
                {displayedReports.length === 0 && (
                  <div className="p-4 text-center text-slate-500 text-xs sm:text-sm">
                    Tiada program yang memerlukan laporan.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Detail/Upload Form */}
          <div
            className={`${isStudent ? 'lg:col-span-2' : 'col-span-3'} bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-8 h-auto lg:h-[600px] overflow-y-auto ${!selectedAppId && isStudent ? 'hidden lg:block' : 'block'}`}
          >
            {selectedItem ? (
              <div className="space-y-4 sm:space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                  <div>
                    <button
                      onClick={() => setSelectedAppId(null)}
                      className="text-[10px] sm:text-sm font-bold text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1 transition-colors"
                    >
                      &larr; Kembali ke Senarai
                    </button>
                    <h3 className="text-base sm:text-xl font-bold text-slate-900 font-display tracking-tight leading-tight">
                      {isStudent
                        ? `Hantar Laporan: ${selectedItem.app.title}`
                        : `Semakan Laporan: ${selectedItem.app.title}`}
                    </h3>
                    <p className="text-[10px] sm:text-sm text-slate-500 mt-1">
                      {isStudent
                        ? 'Lengkapkan semua dokumen yang diperlukan untuk pengesahan.'
                        : 'Sila semak dokumen yang dihantar oleh pelajar.'}
                    </p>
                  </div>
                </div>

                {isStudent ? (
                  // STUDENT VIEW: UPLOAD FORM
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6 flex gap-3 sm:gap-4 items-start">
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] sm:text-sm text-amber-800 leading-relaxed font-medium">
                        Sila pastikan semua resit telah disahkan oleh penasihat program sebelum
                        dimuat naik. Anda tidak boleh memohon program baharu selagi laporan ini
                        tidak diluluskan.
                      </p>
                    </div>

                    <form
                      className="grid gap-4 sm:gap-5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCreateReport();
                      }}
                    >
                      {/* Jumlah Kewangan Kesatuan Mahasiswa */}
                      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                        <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                          Jumlah Kewangan Kesatuan Mahasiswa yang Digunakan (RM)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs sm:text-sm">
                            RM
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            required
                            value={unionBudgetUsed}
                            onChange={(e) => setUnionBudgetUsed(e.target.value)}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            placeholder="0.00"
                            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow font-semibold"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic">
                          Sila masukkan jumlah sebenar peruntukan Kesatuan Mahasiswa yang telah
                          dibelanjakan.
                        </p>
                      </div>

                      {/* Bilangan Peserta Program */}
                      <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                        <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                          Bilangan Peserta Program
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min={0}
                            required
                            value={participantCount}
                            onChange={(e) => setParticipantCount(e.target.value)}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            placeholder="0"
                            className="w-full px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow font-semibold"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic">
                          Sila masukkan jumlah peserta yang menyertai program ini.
                        </p>
                      </div>

                      {/* Laporan Akhir */}
                      <div
                        className={`border border-slate-200 rounded-2xl p-3 sm:p-5 flex items-center gap-3 sm:gap-5 transition-colors group cursor-pointer ${reportFile ? 'bg-emerald-50 border-emerald-200' : 'hover:border-blue-300'}`}
                        onClick={() => document.getElementById('report-upload')?.click()}
                      >
                        <input
                          id="report-upload"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                showNotification('Saiz fail melebihi 5MB', 'error');
                                return;
                              }
                              setReportFile(file);
                            }
                          }}
                        />
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${reportFile ? 'bg-emerald-100' : 'bg-blue-50 group-hover:bg-blue-100'}`}
                        >
                          {reportFile ? (
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                          ) : (
                            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {reportFile ? reportFile.name : 'Laporan Akhir Program (PDF)'}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                            {reportFile
                              ? `${(reportFile.size / 1024 / 1024).toFixed(2)} MB`
                              : 'Format rasmi HEPA (Maksimum 5MB)'}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="hidden sm:block px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 transition-colors"
                        >
                          {reportFile ? 'Tukar Fail' : 'Pilih Fail'}
                        </button>
                      </div>

                      {/* Resit Kewangan */}
                      <div
                        className={`border border-slate-200 rounded-2xl p-3 sm:p-5 flex items-center gap-3 sm:gap-5 transition-colors group cursor-pointer ${receiptFile ? 'bg-emerald-50 border-emerald-200' : 'hover:border-blue-300'}`}
                        onClick={() => document.getElementById('receipt-upload')?.click()}
                      >
                        <input
                          id="receipt-upload"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                showNotification('Saiz fail melebihi 5MB', 'error');
                                return;
                              }
                              setReceiptFile(file);
                            }
                          }}
                        />
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${receiptFile ? 'bg-emerald-100' : 'bg-amber-50 group-hover:bg-amber-100'}`}
                        >
                          {receiptFile ? (
                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                          ) : (
                            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {receiptFile ? receiptFile.name : 'Resit & Penyata Kewangan'}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                            {receiptFile
                              ? `${(receiptFile.size / 1024 / 1024).toFixed(2)} MB`
                              : 'Disatukan dalam 1 fail PDF (Maksimum 5MB)'}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="hidden sm:block px-5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 transition-colors"
                        >
                          {receiptFile ? 'Tukar Fail' : 'Pilih Fail'}
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-end pt-4 sm:pt-6 border-t border-slate-100 mt-2 gap-3">
                        <button
                          type="submit"
                          disabled={submitting || !reportFile || !receiptFile}
                          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {submitting ? (
                            <>
                              <Clock className="w-4 h-4 animate-spin" /> Menghantar...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" /> Hantar Laporan Lengkap
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  // REVIEWER VIEW: APPROVE/REJECT
                  <div className="space-y-6 sm:space-y-8">
                    <div className="grid gap-4 sm:gap-5">
                      {/* Ringkasan Kewangan & Peserta */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="bg-blue-50 p-3 sm:p-5 rounded-2xl border border-blue-100 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-[10px] sm:text-sm font-bold text-blue-900 truncate">
                              Jumlah Kewangan Digunakan
                            </h4>
                            <p className="text-[9px] sm:text-xs text-blue-600 mt-0.5 truncate">
                              Berdasarkan penyata kewangan
                            </p>
                          </div>
                          <div className="text-sm sm:text-xl font-bold text-blue-700 whitespace-nowrap">
                            RM{' '}
                            {selectedItem.report?.unionBudgetUsed?.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }) || '0.00'}
                          </div>
                        </div>

                        <div className="bg-emerald-50 p-3 sm:p-5 rounded-2xl border border-emerald-100 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-[10px] sm:text-sm font-bold text-emerald-900 truncate">
                              Bilangan Peserta
                            </h4>
                            <p className="text-[9px] sm:text-xs text-emerald-600 mt-0.5 truncate">
                              Jumlah peserta program
                            </p>
                          </div>
                          <div className="text-sm sm:text-xl font-bold text-emerald-700 whitespace-nowrap">
                            {selectedItem.report?.participantCount || 0} Orang
                          </div>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-2xl p-3 sm:p-5 flex items-center gap-3 sm:gap-5 bg-slate-50">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-[11px] sm:text-sm truncate">
                            Laporan Akhir Program.pdf
                          </h4>
                          <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                            Dimuat naik pada{' '}
                            {selectedItem.report?.submittedAt
                              ? new Date(selectedItem.report.submittedAt).toLocaleDateString()
                              : '-'}
                          </p>
                        </div>
                        <FileLink
                          stored={selectedItem.report?.reportUrl || ''}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-200 rounded-xl text-blue-600 hover:text-blue-800 text-[10px] sm:text-sm font-bold transition-colors text-center whitespace-nowrap"
                        >
                          Lihat Fail
                        </FileLink>
                      </div>

                      <div className="border border-slate-200 rounded-2xl p-3 sm:p-5 flex items-center gap-3 sm:gap-5 bg-slate-50">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0">
                          <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-[11px] sm:text-sm truncate">
                            Resit_Kewangan.pdf
                          </h4>
                          <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                            Dimuat naik pada{' '}
                            {selectedItem.report?.submittedAt
                              ? new Date(selectedItem.report.submittedAt).toLocaleDateString()
                              : '-'}
                          </p>
                        </div>
                        <FileLink
                          stored={selectedItem.report?.receiptUrl || ''}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white border border-slate-200 rounded-xl text-blue-600 hover:text-blue-800 text-[10px] sm:text-sm font-bold transition-colors text-center whitespace-nowrap"
                        >
                          Lihat Fail
                        </FileLink>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-6 border-t border-slate-100">
                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                          Pengesahan Bajet Digunakan (RM)
                        </label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs sm:text-sm">
                            RM
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            value={verifiedBudget}
                            onChange={(e) => setVerifiedBudget(e.target.value)}
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            placeholder="0.00"
                            className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow font-semibold"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 italic">
                          Sila sahkan jumlah peruntukan yang telah disemak.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">
                          Ulasan Semakan
                        </label>
                        <textarea
                          className="w-full border border-slate-300 rounded-xl p-3 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                          rows={3}
                          placeholder="Masukkan ulasan jika ada pembetulan..."
                          value={reviewerComment}
                          onChange={(e) => setReviewerComment(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4">
                      <button
                        onClick={() => handleUpdateStatus('Perlu Pembetulan')}
                        disabled={submitting || selectedItem.status === 'Tertunggak'}
                        className="w-full sm:w-auto px-5 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-xl font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
                      >
                        <XCircle className="w-4 h-4" />{' '}
                        {submitting ? 'Memproses...' : 'Tolak / Minta Pembetulan'}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus('Disahkan')}
                        disabled={submitting || selectedItem.status === 'Tertunggak'}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
                      >
                        <CheckCircle className="w-4 h-4" />{' '}
                        {submitting ? 'Memproses...' : 'Sahkan Laporan'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <FileText className="w-16 h-16 mb-4 text-slate-200" />
                <p className="font-medium text-slate-600">Pilih laporan di sebelah kiri</p>
                <p className="text-sm mt-1">
                  {isStudent
                    ? 'Untuk mula memuat naik laporan pascaprogram.'
                    : 'Untuk menyemak laporan yang dihantar.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
