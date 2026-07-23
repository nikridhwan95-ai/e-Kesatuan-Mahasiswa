// Senarai permohonan — kad untuk paparan mudah alih dan jadual untuk desktop,
// dengan tindakan mengikut status dan peranan. Senarai yang diterima sudah
// ditapis (carian dan status) oleh ApplicationModule (orkestrator).
import { Calendar, FileText, XCircle } from 'lucide-react';
import { Application } from '../../types';
import StatusBadge from '../shared/StatusBadge';
import { formatTarikh } from '../../utils/dateUtils';

interface ApplicationListProps {
  displayedApps: Application[];
  usersMap: Record<string, string>;
  isStudent: boolean;
  setSelectedApp: (app: Application) => void;
  setShowLetter: (show: boolean) => void;
  handleEditApplication: (app: Application) => void;
  handleAmendApplication: (app: Application) => void;
  handleDeleteApplication: (appId: string) => void;
}

export default function ApplicationList({
  displayedApps,
  usersMap,
  isStudent,
  setSelectedApp,
  setShowLetter,
  handleEditApplication,
  handleAmendApplication,
  handleDeleteApplication,
}: ApplicationListProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Mobile View: Cards */}
      <div className="block lg:hidden divide-y divide-slate-100">
        {displayedApps.map((app) => (
          <div key={app.id} className="p-4 space-y-4 hover:bg-slate-50 transition-colors">
            <div
              className="flex justify-between items-start gap-3"
              onClick={() => setSelectedApp(app)}
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 truncate">{app.title}</h4>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                  ID: {app.id}
                </p>
              </div>
              <StatusBadge status={app.status} className="shrink-0" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs" onClick={() => setSelectedApp(app)}>
              <div className="flex items-center gap-2 text-slate-500">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="font-medium">{formatTarikh(app.startDate)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <span className="text-slate-400 font-medium">Bajet:</span>
                RM {app.budget.toLocaleString()}
              </div>
            </div>

            {!isStudent && (
              <div
                className="flex items-center gap-2 pt-2 border-t border-slate-100"
                onClick={() => setSelectedApp(app)}
              >
                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  {(usersMap[app.applicantId] || 'T').charAt(0)}
                </div>
                <span className="text-xs font-medium text-slate-600 truncate">
                  {usersMap[app.applicantId] || 'Tiada Rekod'}
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
              {(app.status === 'Draf' || app.status === 'Menunggu Semakan') && isStudent && (
                <>
                  <button
                    onClick={() => handleEditApplication(app)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteApplication(app.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Batal"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </>
              )}
              {app.status === 'Lulus Sepenuhnya' && (
                <>
                  {isStudent && (
                    <button
                      onClick={() => handleAmendApplication(app)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Pinda"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSelectedApp(app);
                      setShowLetter(true);
                    }}
                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Surat"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedApp(app)}
                className="text-blue-600 text-xs font-bold px-3 py-1.5 bg-blue-50 rounded-lg"
              >
                Lihat Butiran
              </button>
            </div>
          </div>
        ))}
        {displayedApps.length === 0 && (
          <div className="p-12 text-center text-slate-500 text-sm">Tiada permohonan dijumpai.</div>
        )}
      </div>

      {/* Desktop View: Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">ID / Tajuk Program</th>
              {!isStudent && <th className="px-6 py-4 font-semibold">Pemohon</th>}
              <th className="px-6 py-4 font-semibold">Tarikh Program</th>
              <th className="px-6 py-4 font-semibold">Bajet</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayedApps.map((app) => (
              <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-semibold text-slate-900">{app.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5" title={app.id}>
                    ID: {app.id}
                  </div>
                </td>
                {!isStudent && (
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-700">
                      {usersMap[app.applicantId] || 'Tiada Rekod'}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatTarikh(app.startDate)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 font-bold text-slate-700">
                    RM {app.budget.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={app.status} />
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {(app.status === 'Draf' || app.status === 'Menunggu Semakan') && isStudent && (
                      <>
                        <button
                          onClick={() => handleEditApplication(app)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                          title="Kemas Kini Permohonan"
                        >
                          <FileText className="w-4 h-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          className="text-red-600 hover:text-red-800 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                          title="Batal Permohonan"
                        >
                          <XCircle className="w-4 h-4" /> Batal
                        </button>
                      </>
                    )}
                    {app.status === 'Lulus Sepenuhnya' && (
                      <>
                        {isStudent && (
                          <button
                            onClick={() => handleAmendApplication(app)}
                            className="text-amber-600 hover:text-amber-800 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                            title="Pinda Program"
                          >
                            <FileText className="w-4 h-4" /> Pinda
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setShowLetter(true);
                          }}
                          className="text-emerald-600 hover:text-emerald-800 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                          title="Muat Turun Surat Kelulusan"
                        >
                          <FileText className="w-4 h-4" /> Surat
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-4 h-4" /> Lihat
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {displayedApps.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Tiada permohonan dijumpai.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
