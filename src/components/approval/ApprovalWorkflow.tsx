import React, { useState } from 'react';
import { Application, ApplicationStatus, UserRole } from '../../types';
import { CheckCircle, XCircle, Clock, FileText, AlertTriangle, Calendar } from 'lucide-react';

interface ApprovalWorkflowProps {
  application: Application;
  currentUserRole: UserRole;
  onApprove: (id: string, comments?: string, approvedAmount?: number) => void;
  onReject: (id: string, comments?: string) => void;
  onRequestRevision: (id: string, comments: string) => void;
  onSchedulePresentation: (id: string, date: string) => void;
}

const statusMap: Record<
  ApplicationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  Draf: {
    label: 'Draf',
    color: 'text-slate-500 bg-slate-100 border border-slate-200',
    icon: <FileText className="w-4 h-4" />,
  },
  'Menunggu Semakan': {
    label: 'Menunggu Semakan (Kesatuan Mahasiswa)',
    color: 'text-blue-700 bg-blue-50 border border-blue-200',
    icon: <Clock className="w-4 h-4" />,
  },
  'Perlu Pembetulan': {
    label: 'Perlu Pembetulan',
    color: 'text-yellow-800 bg-yellow-100 border border-yellow-300',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  'Menunggu Pembentangan': {
    label: 'Menunggu Pembentangan',
    color: 'text-purple-700 bg-purple-50 border border-purple-200',
    icon: <Calendar className="w-4 h-4" />,
  },
  'Menunggu Kelulusan YDP': {
    label: 'Menunggu Kelulusan YDP MPP',
    color: 'text-amber-700 bg-amber-50 border border-amber-200',
    icon: <Clock className="w-4 h-4" />,
  },
  'Menunggu Kelulusan TNC HEPA': {
    label: 'Menunggu Kelulusan TNC HEPA',
    color: 'text-indigo-700 bg-indigo-50 border border-indigo-200',
    icon: <Clock className="w-4 h-4" />,
  },
  'Lulus Sepenuhnya': {
    label: 'Lulus Sepenuhnya',
    color: 'text-emerald-700 bg-emerald-50 border border-emerald-200',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  Ditolak: {
    label: 'Ditolak',
    color: 'text-red-700 bg-red-50 border border-red-200',
    icon: <XCircle className="w-4 h-4" />,
  },
  Dibatalkan: {
    label: 'Dibatalkan',
    color: 'text-slate-500 bg-slate-100 border border-slate-200',
    icon: <XCircle className="w-4 h-4" />,
  },
  'Menunggu Semakan Pindaan': {
    label: 'Menunggu Semakan Pindaan (Unit Kertas Kerja)',
    color: 'text-blue-700 bg-blue-50 border border-blue-200',
    icon: <Clock className="w-4 h-4" />,
  },
  'Menunggu Kelulusan YDP (Pindaan)': {
    label: 'Menunggu Kelulusan YDP MPP (Pindaan)',
    color: 'text-amber-700 bg-amber-50 border border-amber-200',
    icon: <Clock className="w-4 h-4" />,
  },
};

export default function ApprovalWorkflow({
  application,
  currentUserRole,
  onApprove,
  onReject,
  onRequestRevision,
  onSchedulePresentation,
}: ApprovalWorkflowProps) {
  const [comments, setComments] = useState('');
  const [presentationDate, setPresentationDate] = useState('');
  const [approvedAmount, setApprovedAmount] = useState<number | undefined>(
    application.approvedAmount,
  );

  const currentStatus = statusMap[application.status] || statusMap['Draf'];

  // Logic to determine if the current user can act on this application
  const canAct = () => {
    switch (application.status) {
      case 'Menunggu Semakan':
        return currentUserRole === 'unit_semakan' || currentUserRole === 'admin';
      case 'Menunggu Pembentangan':
        return currentUserRole === 'admin' || currentUserRole === 'unit_pembentangan';
      case 'Menunggu Kelulusan YDP':
        return currentUserRole === 'ydp' || currentUserRole === 'admin';
      case 'Menunggu Kelulusan TNC HEPA':
        return currentUserRole === 'tnc_hepa' || currentUserRole === 'admin';
      case 'Menunggu Semakan Pindaan':
        return currentUserRole === 'unit_kertas_kerja' || currentUserRole === 'admin';
      case 'Menunggu Kelulusan YDP (Pindaan)':
        return currentUserRole === 'ydp' || currentUserRole === 'admin';
      default:
        return false;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display tracking-tight">
            Aliran Kelulusan
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Status semasa permohonan program ini.
          </p>
        </div>
        {currentStatus && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold shadow-sm ${currentStatus.color}`}
          >
            {currentStatus.icon}
            {currentStatus.label}
          </div>
        )}
      </div>

      {/* Action Area */}
      {canAct() ? (
        <div className="space-y-5">
          <label className="block text-sm font-semibold text-slate-700">
            Komen / Ulasan (Pilihan)
          </label>
          <textarea
            className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
            rows={3}
            placeholder="Sila masukkan ulasan atau sebab penolakan/pembetulan..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />

          {application.status === 'Menunggu Pembentangan' &&
            (currentUserRole === 'unit_pembentangan' || currentUserRole === 'admin') && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Jumlah Kewangan Diluluskan (RM)
                </label>
                <input
                  type="number"
                  className="w-full border border-slate-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                  placeholder="0.00"
                  value={approvedAmount || ''}
                  onChange={(e) => setApprovedAmount(Number(e.target.value))}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
                <p className="text-xs text-slate-500 italic">
                  *Sila tetapkan jumlah bajet yang diluluskan untuk program ini.
                </p>
              </div>
            )}

          {/* Specific Actions based on Role and Status */}
          {application.status === 'Menunggu Pembentangan' && currentUserRole === 'admin' && (
            <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <label className="block text-sm font-semibold text-slate-700">
                Tetapkan Tarikh Semakan
              </label>
              <input
                type="datetime-local"
                className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                value={presentationDate}
                onChange={(e) => setPresentationDate(e.target.value)}
              />
              <button
                onClick={() => onSchedulePresentation(application.id, presentationDate)}
                disabled={!presentationDate}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm shadow-blue-600/20 mt-2"
              >
                Jadualkan Semakan
              </button>
            </div>
          )}

          {application.status !== 'Menunggu Pembentangan' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pt-2">
              <button
                onClick={() => onApprove(application.id, comments, approvedAmount)}
                className="bg-emerald-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20"
              >
                <CheckCircle className="w-5 h-5" />
                {application.status === 'Menunggu Semakan'
                  ? 'Sokong'
                  : application.status === 'Menunggu Semakan Pindaan'
                    ? 'Sokong Pindaan'
                    : 'Luluskan'}
              </button>

              {(application.status === 'Menunggu Semakan' ||
                application.status === 'Menunggu Semakan Pindaan') && (
                <button
                  onClick={() => onRequestRevision(application.id, comments)}
                  disabled={!comments}
                  className="bg-amber-50 text-amber-700 border border-amber-200 py-3 px-4 rounded-xl font-semibold hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-5 h-5" />
                  Pembetulan
                </button>
              )}

              <button
                onClick={() => onReject(application.id, comments)}
                disabled={!comments} // Require comments for rejection
                className="bg-red-50 text-red-700 border border-red-200 py-3 px-4 rounded-xl font-semibold hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Tolak
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-6 text-center text-sm text-slate-500 border border-slate-200 font-medium">
          Anda tidak mempunyai akses untuk mengambil tindakan pada peringkat ini, atau permohonan
          sedang menunggu tindakan pihak lain.
        </div>
      )}
    </div>
  );
}
