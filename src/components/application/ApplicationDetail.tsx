// Paparan butiran permohonan — maklumat program, dokumen sokongan, tindakan
// mengikut peranan dan Jejak Status. Semua keadaan dan pengendali diurus oleh
// ApplicationModule (orkestrator); komponen ini paparan sahaja.
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  XCircle,
} from 'lucide-react';
import { Application, ApplicationStatus, PresentationSession } from '../../types';
import FileLink from '../shared/FileLink';
import StatusBadge from '../shared/StatusBadge';
import { formatTarikh } from '../../utils/dateUtils';
import ApplicationTimeline from './ApplicationTimeline';

interface ApplicationDetailProps {
  app: Application;
  sessions: PresentationSession[];
  usersMap: Record<string, string>;
  isStudent: boolean;
  isReviewer: boolean;
  isAdmin: boolean;
  loading: boolean;
  correctionFile: File | null;
  setCorrectionFile: (file: File | null) => void;
  setSelectedApp: (app: Application | null) => void;
  setShowLetter: (show: boolean) => void;
  handleEditApplication: (app: Application) => void;
  handleAmendApplication: (app: Application) => void;
  handleDeleteApplication: (appId: string) => void;
  handleUpdateStatus: (appId: string, status: ApplicationStatus) => void;
  handleDeletePaper: () => void;
  handleSubmitCorrection: () => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
}

export default function ApplicationDetail({
  app,
  sessions,
  usersMap,
  isStudent,
  isReviewer,
  isAdmin,
  loading,
  correctionFile,
  setCorrectionFile,
  setSelectedApp,
  setShowLetter,
  handleEditApplication,
  handleAmendApplication,
  handleDeleteApplication,
  handleUpdateStatus,
  handleDeletePaper,
  handleSubmitCorrection,
  showNotification,
}: ApplicationDetailProps) {
  return (
    <>
      <button
        onClick={() => setSelectedApp(null)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-medium transition-colors"
      >
        &larr; Kembali ke Senarai
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] sm:text-sm font-bold text-slate-400 tracking-wider uppercase">
                {app.id}
              </span>
              <StatusBadge status={app.status} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
              {app.title}
            </h2>
          </div>
          {isStudent && (
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              {app.status === 'Perlu Pembetulan' && (
                <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-200 transition-colors">
                  <Upload className="w-4 h-4" /> Muat Naik
                </button>
              )}
              {(app.status === 'Draf' || app.status === 'Menunggu Semakan') && (
                <>
                  <button
                    onClick={() => {
                      handleEditApplication(app);
                      setSelectedApp(null);
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-200 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteApplication(app.id)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-200 transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Batal
                  </button>
                </>
              )}
            </div>
          )}
          {(isReviewer || isAdmin) && app.status === 'Menunggu Semakan' && (
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => handleUpdateStatus(app.id, 'Ditolak')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-200 transition-colors"
              >
                <XCircle className="w-4 h-4" /> Tolak
              </button>
              <button
                onClick={() => handleUpdateStatus(app.id, 'Perlu Pembetulan')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-200 transition-colors"
              >
                <AlertTriangle className="w-4 h-4" /> Pembetulan
              </button>
              <button
                onClick={() => handleUpdateStatus(app.id, 'Menunggu Pembentangan')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-600/20"
              >
                <CheckCircle className="w-4 h-4" /> Sokong
              </button>
            </div>
          )}
          {app.status === 'Lulus Sepenuhnya' && (
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              {isStudent && (
                <button
                  onClick={() => {
                    handleAmendApplication(app);
                    setSelectedApp(null);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-200 transition-colors"
                >
                  <FileText className="w-4 h-4" /> Pinda
                </button>
              )}
              <button
                onClick={() => setShowLetter(true)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
              >
                <FileText className="w-4 h-4" /> Surat
              </button>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="md:col-span-2 space-y-6 sm:space-y-8">
            <section>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Maklumat Program
              </h3>

              {(app.status === 'Perlu Pembetulan' || app.status === 'Ditolak') && (
                <div
                  className={`mb-6 ${app.status === 'Ditolak' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'} border rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300`}
                >
                  <h4
                    className={`text-sm font-bold ${app.status === 'Ditolak' ? 'text-red-900' : 'text-amber-900'} mb-1 flex items-center gap-2`}
                  >
                    {app.status === 'Ditolak' ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    Catatan Kesatuan Mahasiswa:
                  </h4>
                  <p
                    className={`text-sm ${app.status === 'Ditolak' ? 'text-red-800' : 'text-amber-800'}`}
                  >
                    {app.reviewerComment || 'Tiada catatan disediakan.'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Jawatan Pemohon
                  </p>
                  <p className="text-slate-900 font-medium">{app.applicantPosition || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Kategori
                  </p>
                  <p className="text-slate-900 font-medium">{app.category}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Peringkat Penganjuran
                  </p>
                  <p className="text-slate-900 font-medium">{app.organizingLevel || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Tarikh Program
                  </p>
                  <p className="text-slate-900 font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatTarikh(app.startDate)}
                    {app.startDate &&
                      app.endDate &&
                      app.startDate !== app.endDate &&
                      ` - ${formatTarikh(app.endDate)}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Tempat
                  </p>
                  <p className="text-slate-900 font-medium">{app.venue || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Penceramah
                  </p>
                  <p className="text-slate-900 font-medium">{app.speaker || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Bajet Dimohon
                  </p>
                  <p className="text-slate-900 font-medium flex items-center gap-1.5">
                    RM {app.budget.toLocaleString()}
                  </p>
                </div>
                {app.jointlyOrganizedWith && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Anjuran Bersama
                    </p>
                    <p className="text-slate-900 font-medium">{app.jointlyOrganizedWith}</p>
                  </div>
                )}
                {!isStudent && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Pemohon
                    </p>
                    <p className="text-slate-900 font-medium">
                      {usersMap[app.applicantId] || 'Tiada Rekod'}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Objektif Utama
              </h3>
              <p className="text-slate-700 leading-relaxed">{app.objective}</p>
            </section>

            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Impak Program (Kemahiran Insaniah)
              </h3>
              <div className="flex flex-wrap gap-2">
                {app.softSkills && app.softSkills.length > 0 ? (
                  app.softSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic">Tiada kemahiran insaniah dipilih.</p>
                )}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
                Dokumen Sokongan
              </h3>

              {app.paperUrl ? (
                <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
                  <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Kertas_Kerja_Program.pdf</p>
                    <p className="text-xs text-slate-500">Dokumen PDF</p>
                  </div>
                  <FileLink
                    stored={app.paperUrl}
                    className="text-blue-600 hover:text-blue-800 text-sm font-semibold mr-2"
                  >
                    Muat Turun
                  </FileLink>

                  {isStudent && app.status === 'Perlu Pembetulan' && (
                    <button
                      onClick={handleDeletePaper}
                      className="text-red-600 hover:text-red-800 text-sm font-semibold flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" /> Padam
                    </button>
                  )}
                </div>
              ) : isStudent && app.status === 'Perlu Pembetulan' ? (
                <div
                  className={`border-2 border-dashed ${correctionFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50'} rounded-2xl p-8 text-center transition-colors cursor-pointer group`}
                  onClick={() => document.getElementById('correction-upload')?.click()}
                >
                  <input
                    id="correction-upload"
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
                        setCorrectionFile(file);
                      }
                    }}
                  />
                  {correctionFile ? (
                    <div className="animate-in fade-in zoom-in duration-300">
                      <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                      <p className="text-sm text-emerald-700 font-bold">{correctionFile.name}</p>
                      <p className="text-xs text-emerald-500 mt-1">
                        {(correctionFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <p className="text-xs text-emerald-600 mt-2 font-medium">
                        Klik untuk tukar fail
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3 group-hover:text-blue-500 transition-colors" />
                      <p className="text-sm text-slate-600 font-medium">
                        Muat Naik Kertas Kerja Baharu
                      </p>
                      <p className="text-xs text-slate-400 mt-1">PDF, Maksimum 5MB</p>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">Tiada dokumen dilampirkan.</p>
              )}

              {isStudent && app.status === 'Perlu Pembetulan' && (
                <div className="mt-6 flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={handleSubmitCorrection}
                    disabled={(!app.paperUrl && !correctionFile) || loading}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <Clock className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Hantar Pembetulan
                  </button>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <ApplicationTimeline app={app} sessions={sessions} />
          </div>
        </div>
      </div>
    </>
  );
}
