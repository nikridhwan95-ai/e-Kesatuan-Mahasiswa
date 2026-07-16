import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, RefreshCw, Search, Radar as RadarIcon } from 'lucide-react';
import { User } from '../../types';
import { getUsers } from '../../services/firestoreService';
import {
  COMPETENCY_CODES,
  Evidence,
  competencyName,
  recalculateStudent,
} from '../../bakat/domain';
import { getAllEvidence, syncAllEvidence } from '../../bakat/evidenceService';
import BakatProfile from './BakatProfile';

// Radar Bakat (Admin/HEP) — carian bakat merentas semua pelajar.
// Skor setiap pelajar dikira semula daripada evidence pada masa nyata.
export default function TalentSearchModule() {
  const [users, setUsers] = useState<User[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, evidenceData] = await Promise.all([getUsers(), getAllEvidence()]);
      setUsers(usersData);
      setEvidence(evidenceData);
    } catch (error) {
      console.error('Error fetching talent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncAllEvidence();
      setNotification(
        result.created > 0
          ? `Segerak selesai: ${result.created} evidence baharu dijana daripada ${result.programmes} program.`
          : 'Segerak selesai: semua evidence sudah terkini.'
      );
      setTimeout(() => setNotification(null), 5000);
      await fetchData();
    } catch (error) {
      console.error('Error syncing evidence:', error);
      setNotification('Gagal menyegerak evidence. Sila cuba lagi.');
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setSyncing(false);
    }
  };

  // Profil bakat ringkas per pelajar: kekuatan teratas + bilangan evidence.
  const talentRows = useMemo(() => {
    const byStudent = new Map<string, Evidence[]>();
    for (const e of evidence) {
      const arr = byStudent.get(e.student_id) ?? [];
      arr.push(e);
      byStudent.set(e.student_id, arr);
    }

    return users
      .filter((u) => u.role === 'student' || byStudent.has(u.uid))
      .map((u) => {
        const ev = byStudent.get(u.uid) ?? [];
        const scores = recalculateStudent(u.uid, COMPETENCY_CODES, ev);
        const strengths = scores
          .filter((s) => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);
        return {
          user: u,
          evidenceCount: ev.filter((e) => e.status === 'approved').length,
          strengths,
          topScore: strengths[0]?.score ?? 0,
        };
      })
      .sort((a, b) => b.topScore - a.topScore);
  }, [users, evidence]);

  const displayedRows = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return talentRows;
    return talentRows.filter(({ user, strengths }) => {
      const haystack = [
        user.name,
        (user as { displayName?: string }).displayName,
        user.email,
        user.matricNumber,
        user.faculty,
        user.college,
        ...strengths.map((s) => competencyName(s.competency_id)),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [talentRows, searchTerm]);

  if (selectedStudent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <button
              onClick={() => setSelectedStudent(null)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Carian Bakat
            </button>
            <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
              {(selectedStudent as { displayName?: string }).displayName || selectedStudent.name}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {[selectedStudent.matricNumber, selectedStudent.faculty, selectedStudent.college]
                .filter(Boolean)
                .join(' · ') || selectedStudent.email}
            </p>
          </div>
        </div>
        <BakatProfile studentId={selectedStudent.uid} studentName={selectedStudent.name} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Radar Bakat</h2>
          <p className="text-sm text-slate-500 mt-1">
            Kecerdasan bakat pelajar — diterbitkan daripada evidence program e-Kesatuan yang disahkan.
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20 disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Segerak Evidence
        </button>
      </div>

      {notification && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm font-medium">
          {notification}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama, no. matrik, fakulti, kolej atau kompetensi (cth: Kepimpinan)..."
          className="w-full border border-slate-300 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow bg-white"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayedRows.map(({ user, evidenceCount, strengths }) => (
            <button
              key={user.uid}
              onClick={() => setSelectedStudent(user)}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                    {(user as { displayName?: string }).displayName || user.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {[user.matricNumber, user.faculty].filter(Boolean).join(' · ') || user.email}
                  </p>
                </div>
                <RadarIcon className="w-5 h-5 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
              </div>

              {strengths.length > 0 ? (
                <div className="mt-4 space-y-1.5">
                  {strengths.map((s) => (
                    <div key={s.competency_id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{competencyName(s.competency_id)}</span>
                      <span className="font-semibold tabular-nums text-blue-600">{s.score}</span>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-slate-400">{evidenceCount} evidence diluluskan</p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400 italic">Tiada evidence lagi</p>
              )}
            </button>
          ))}
          {displayedRows.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 italic bg-white rounded-2xl border border-dashed border-slate-300">
              Tiada pelajar sepadan dengan carian.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
