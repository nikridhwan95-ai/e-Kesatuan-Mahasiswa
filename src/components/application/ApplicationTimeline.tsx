// Jejak Status permohonan — garis masa empat peringkat kelulusan (Dihantar →
// Semakan KM → YDP MPP → TNC HEPA) berserta panel jadual semakan rasmi.
import { ArrowRight, Calendar, CheckCircle, Clock, DoorOpen, Link as LinkIcon } from 'lucide-react';
import { Application, PresentationSession } from '../../types';
import { formatTarikh } from '../../utils/dateUtils';

interface ApplicationTimelineProps {
  app: Application;
  sessions: PresentationSession[];
}

export default function ApplicationTimeline({ app, sessions }: ApplicationTimelineProps) {
  return (
    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
        Jejak Status
      </h3>
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
        {/* Timeline Item 1: Dihantar */}
        <div className="relative flex items-start gap-4">
          <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-blue-600 text-white shadow shrink-0 z-10 mt-1">
            <CheckCircle className="w-3 h-3" />
          </div>
          <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between space-x-2 mb-1">
              <div className="font-bold text-slate-900 text-sm">Dihantar</div>
              <time className="font-mono text-xs text-slate-500">
                {formatTarikh(app.createdAt)}
              </time>
            </div>
            <div className="text-slate-500 text-xs">Permohonan dihantar oleh pemohon.</div>
          </div>
        </div>

        {/* Timeline Item 2: Semakan KM / Semakan */}
        {[
          'Menunggu Pembentangan',
          'Menunggu Kelulusan YDP',
          'Menunggu Kelulusan TNC HEPA',
          'Lulus Sepenuhnya',
        ].includes(app.status) && (
          <div className="relative flex items-start gap-4">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white ${['Menunggu Kelulusan YDP', 'Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(app.status) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'} shadow shrink-0 z-10 mt-1`}
            >
              {[
                'Menunggu Kelulusan YDP',
                'Menunggu Kelulusan TNC HEPA',
                'Lulus Sepenuhnya',
              ].includes(app.status) ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
            </div>
            <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div className="font-bold text-slate-900 text-sm">Sesi Semakan KM</div>
                {[
                  'Menunggu Kelulusan YDP',
                  'Menunggu Kelulusan TNC HEPA',
                  'Lulus Sepenuhnya',
                ].includes(app.status) &&
                  app.presentationDate && (
                    <time className="font-mono text-xs text-slate-500">
                      {formatTarikh(app.presentationDate)}
                    </time>
                  )}
              </div>
              <div className="text-slate-500 text-xs mb-3">
                {[
                  'Menunggu Kelulusan YDP',
                  'Menunggu Kelulusan TNC HEPA',
                  'Lulus Sepenuhnya',
                ].includes(app.status)
                  ? 'Semakan selesai dan disokong oleh KM.'
                  : 'Menunggu sesi semakan bersama KM.'}
              </div>

              {app.status === 'Menunggu Pembentangan' && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Jadual Semakan Rasmi
                    </p>
                  </div>

                  {app.presentationDate ? (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                              <Calendar className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">
                                Tarikh
                              </p>
                              <p className="text-sm font-semibold text-slate-900">
                                {new Date(app.presentationDate).toLocaleDateString('ms-MY', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">
                                Masa
                              </p>
                              <p className="text-sm font-semibold text-slate-900">
                                {sessions.find((s) => s.id === app.presentationSessionId)?.time ||
                                  'Akan dimaklumkan'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                              <DoorOpen className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">
                                Bilik / Lokasi
                              </p>
                              <p className="text-sm font-semibold text-slate-900">
                                {app.presentationRoom
                                  ? `Bilik ${app.presentationRoom}`
                                  : 'Akan dimaklumkan'}
                              </p>
                            </div>
                          </div>

                          {sessions.find((s) => s.id === app.presentationSessionId)?.link && (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                                <LinkIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 leading-none mb-1">
                                  Pautan Maya
                                </p>
                                <a
                                  href={
                                    sessions.find((s) => s.id === app.presentationSessionId)?.link
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group"
                                >
                                  Sertai Sesi
                                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-blue-600 p-2 text-center">
                        <p className="text-[10px] text-white font-medium uppercase tracking-widest">
                          Sila hadir 10 minit lebih awal
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800">
                      <Clock className="w-5 h-5 opacity-50" />
                      <p className="text-xs font-medium">
                        Jadual semakan sedang dikemas kini oleh Unit Pembentangan. Sila semak semula
                        sebentar lagi.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline Item 3: Kelulusan YDP */}
        {['Menunggu Kelulusan YDP', 'Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(
          app.status,
        ) && (
          <div className="relative flex items-start gap-4">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white ${['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(app.status) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'} shadow shrink-0 z-10 mt-1`}
            >
              {['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(app.status) ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
            </div>
            <div
              className={`flex-1 p-4 rounded-xl border ${['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(app.status) ? 'border-blue-100 bg-blue-50' : 'border-slate-200 bg-white'} shadow-sm`}
            >
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div
                  className={`font-bold text-sm ${['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(app.status) ? 'text-blue-900' : 'text-slate-900'}`}
                >
                  Kelulusan YDP MPP
                </div>
                {/* Tiada cap masa per-langkah dalam model — tiada tarikh dipapar. */}
              </div>
              <div
                className={`text-xs ${['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(app.status) ? 'text-blue-700' : 'text-slate-500'}`}
              >
                {['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(app.status)
                  ? 'Disokong oleh YDP MPP.'
                  : 'Menunggu sokongan YDP MPP.'}
              </div>
            </div>
          </div>
        )}

        {/* Timeline Item 4: Kelulusan TNC HEPA */}
        {['Menunggu Kelulusan TNC HEPA', 'Lulus Sepenuhnya'].includes(app.status) && (
          <div className="relative flex items-start gap-4">
            <div
              className={`flex items-center justify-center w-6 h-6 rounded-full border-2 border-white ${app.status === 'Lulus Sepenuhnya' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'} shadow shrink-0 z-10 mt-1`}
            >
              {app.status === 'Lulus Sepenuhnya' ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <Clock className="w-3 h-3" />
              )}
            </div>
            <div
              className={`flex-1 p-4 rounded-xl border ${app.status === 'Lulus Sepenuhnya' ? 'border-emerald-100 bg-emerald-50' : 'border-slate-200 bg-white'} shadow-sm`}
            >
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div
                  className={`font-bold text-sm ${app.status === 'Lulus Sepenuhnya' ? 'text-emerald-900' : 'text-slate-900'}`}
                >
                  Kelulusan Akhir (TNC HEPA)
                </div>
                {app.status === 'Lulus Sepenuhnya' && (
                  <time className="font-mono text-xs text-emerald-600">
                    {formatTarikh(app.updatedAt)}
                  </time>
                )}
              </div>
              <div
                className={`text-xs ${app.status === 'Lulus Sepenuhnya' ? 'text-emerald-700' : 'text-slate-500'}`}
              >
                {app.status === 'Lulus Sepenuhnya'
                  ? 'Permohonan diluluskan sepenuhnya.'
                  : 'Menunggu kelulusan TNC HEPA.'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
