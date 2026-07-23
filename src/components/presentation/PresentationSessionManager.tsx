import React, { useState } from 'react';
import { Plus, Calendar, Clock, BookOpen, DoorOpen, Trash2, Link as LinkIcon } from 'lucide-react';
import { PresentationSession } from '../../types';
import { getCurrentAcademicSession, generateAcademicSessions } from '../../utils/dateUtils';

interface PresentationSessionManagerProps {
  sessions: PresentationSession[];
  onAddSession: (session: PresentationSession) => void;
  onToggleStatus: (id: string) => void;
  onDeleteSession: (id: string) => void;
}

export default function PresentationSessionManager({ sessions, onAddSession, onToggleStatus, onDeleteSession }: PresentationSessionManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [newSession, setNewSession] = useState<Partial<PresentationSession>>({
    name: '',
    academicSession: getCurrentAcademicSession(),
    roomCount: 1,
    date: '',
    time: '',
    link: '',
    status: 'Open'
  });

  // Generate academic sessions based on current year
  const academicSessions = generateAcademicSessions(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSession.name && newSession.date && newSession.time && newSession.academicSession) {
      onAddSession({
        id: `SESSION-${Date.now()}`, // This ID will be ignored by createPresentationSession in parent
        name: newSession.name,
        academicSession: newSession.academicSession,
        roomCount: newSession.roomCount || 1,
        date: newSession.date,
        time: newSession.time,
        link: newSession.link || '',
        status: newSession.status as 'Open' | 'Closed'
      });
      setIsFormOpen(false);
      setNewSession({ name: '', academicSession: '', roomCount: 1, date: '', time: '', link: '', status: 'Open' });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-display">Pengurusan Sesi Semakan</h3>
          <p className="text-sm text-slate-500 mt-1">Buka dan tutup sesi semakan untuk pelajar.</p>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          {isFormOpen ? 'Batal' : <><Plus className="w-4 h-4" /> Buka Sesi Baru</>}
        </button>
      </div>

      {isFormOpen && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <h4 className="font-bold text-slate-900 mb-4">Borang Semakan Baharu</h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Semakan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Semakan Mac 2026"
                  value={newSession.name}
                  onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Sesi Akademik</label>
                <select
                  required
                  value={newSession.academicSession}
                  onChange={(e) => setNewSession({ ...newSession, academicSession: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Pilih Sesi Akademik...</option>
                  {academicSessions.map(session => (
                    <option key={session} value={session}>{session}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tarikh</label>
                <input
                  type="date"
                  required
                  value={newSession.date}
                  onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Masa</label>
                <input
                  type="time"
                  required
                  value={newSession.time}
                  onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Pautan Bilik (Zoom/Meet)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newSession.link}
                  onChange={(e) => setNewSession({ ...newSession, link: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Bilangan Bilik</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={newSession.roomCount}
                  onChange={(e) => setNewSession({ ...newSession, roomCount: parseInt(e.target.value) || 1 })}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors">
                Simpan Sesi
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Semakan</th>
              <th className="px-6 py-4 font-semibold">Sesi Akademik</th>
              <th className="px-6 py-4 font-semibold">Bilik</th>
              <th className="px-6 py-4 font-semibold">Tarikh</th>
              <th className="px-6 py-4 font-semibold">Masa</th>
              <th className="px-6 py-4 font-semibold">Pautan</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold text-right">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-semibold text-slate-900">{session.name}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    {session.academicSession || '-'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <DoorOpen className="w-4 h-4 text-slate-400" />
                    {session.roomCount || 1} Bilik
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {session.date}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {session.time}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {session.link ? (
                    <a href={session.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline">
                      <LinkIcon className="w-4 h-4" />
                      Pautan
                    </a>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                    session.status === 'Open' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {session.status === 'Open' ? 'Dibuka' : 'Ditutup'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onToggleStatus(session.id)}
                      className={`text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                        session.status === 'Open' 
                          ? 'text-amber-600 border-amber-200 hover:bg-amber-50' 
                          : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      {session.status === 'Open' ? 'Tutup Sesi' : 'Buka Semula'}
                    </button>
                    {sessionToDelete === session.id ? (
                      <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                        <span className="text-[10px] font-semibold text-red-700">Pasti?</span>
                        <button onClick={() => { onDeleteSession(session.id); setSessionToDelete(null); }} className="text-[10px] font-bold text-white bg-red-600 px-1.5 py-0.5 rounded hover:bg-red-700">Ya</button>
                        <button onClick={() => setSessionToDelete(null)} className="text-[10px] font-semibold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded hover:bg-slate-300">Batal</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSessionToDelete(session.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                        title="Padam Sesi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                  Tiada sesi semakan direkodkan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
