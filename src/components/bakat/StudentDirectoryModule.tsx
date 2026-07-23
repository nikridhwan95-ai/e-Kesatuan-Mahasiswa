import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  CalendarDays,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Users2,
} from 'lucide-react';
import { Application, User } from '../../types';
import { getApplications, getUserProfile, getUsers } from '../../services/dataService';
import { Evidence, COMPETENCY_CODES, competencyName, recalculateStudent } from '../../bakat/domain';
import { getAllEvidence } from '../../bakat/evidenceService';
import { overallScore } from '../../bakat/insights';
import { Avatar, BandChip } from './ui';
import BakatProfile from './BakatProfile';

const STATUS_CHIP: Record<string, string> = {
  'Lulus Sepenuhnya': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  Ditolak: 'text-red-700 bg-red-50 border-red-200',
  Dibatalkan: 'text-slate-500 bg-slate-100 border-slate-200',
  'Perlu Pembetulan': 'text-amber-700 bg-amber-50 border-amber-200',
};
const statusChipCls = (s: string) => STATUS_CHIP[s] ?? 'text-blue-700 bg-blue-50 border-blue-200';

// Profil Pelajar (Admin) — direktori semua pelajar; klik untuk halaman profil
// penuh: butiran diri, senarai program e-Kesatuan, dan profil bakat.
export default function StudentDirectoryModule() {
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState<User | null>(null);

  // Senarai getUsers tidak lagi membawa medan sensitif (telefon/alamat);
  // profil penuh diambil melalui getUserProfile apabila pelajar dipilih.
  const selectStudent = (u: User) => {
    setSelected(u);
    getUserProfile(u.uid)
      .then((full) => {
        if (full) setSelected((cur) => (cur && cur.uid === full.uid ? full : cur));
      })
      .catch((error) => console.error('Error fetching full profile:', error));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersData, appsData, evidenceData] = await Promise.all([
          getUsers(),
          getApplications('admin', ''),
          getAllEvidence(),
        ]);
        setUsers(usersData);
        setApplications(appsData);
        setEvidence(evidenceData);
      } catch (error) {
        console.error('Error fetching student directory:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const rows = useMemo(() => {
    const evidenceByStudent = new Map<string, Evidence[]>();
    for (const e of evidence) {
      const arr = evidenceByStudent.get(e.student_id) ?? [];
      arr.push(e);
      evidenceByStudent.set(e.student_id, arr);
    }
    const appCountByStudent = new Map<string, number>();
    for (const a of applications) {
      appCountByStudent.set(a.applicantId, (appCountByStudent.get(a.applicantId) ?? 0) + 1);
    }

    return users
      .filter((u) => u.role === 'student')
      .map((user) => {
        const scores = recalculateStudent(
          user.uid,
          COMPETENCY_CODES,
          evidenceByStudent.get(user.uid) ?? [],
        );
        const strengths = scores.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
        return {
          user,
          overall: overallScore(scores),
          topStrength: strengths[0] ?? null,
          programmeCount: appCountByStudent.get(user.uid) ?? 0,
        };
      })
      .sort((a, b) =>
        ((a.user as { displayName?: string }).displayName || a.user.name).localeCompare(
          (b.user as { displayName?: string }).displayName || b.user.name,
        ),
      );
  }, [users, applications, evidence]);

  const displayedRows = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return rows;
    return rows.filter(({ user }) =>
      [
        user.name,
        (user as { displayName?: string }).displayName,
        user.email,
        user.matricNumber,
        user.faculty,
        user.college,
        user.programme,
        user.studyYear,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [rows, searchTerm]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // ── Halaman profil pelajar ────────────────────────────────────────────────
  if (selected) {
    const displayName = (selected as { displayName?: string }).displayName || selected.name;
    const studentApps = applications
      .filter((a) => a.applicantId === selected.uid)
      .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''));

    const butiran: { icon: typeof Mail; label: string; value?: string }[] = [
      { icon: Mail, label: 'E-mel', value: selected.email },
      { icon: Phone, label: 'No. Telefon', value: selected.phoneNumber },
      { icon: GraduationCap, label: 'Fakulti', value: selected.faculty },
      { icon: Building2, label: 'Kolej', value: selected.college },
      {
        icon: CalendarDays,
        label: 'Tahun Pengajian',
        value: selected.studyYear ? `Tahun ${selected.studyYear}` : undefined,
      },
      { icon: BookOpen, label: 'Program Pengajian', value: selected.programme },
      { icon: MapPin, label: 'Alamat', value: selected.address },
    ];

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Profil Pelajar
        </button>

        {/* Butiran diri */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-6">
            <Avatar name={displayName} size="lg" />
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-xl font-bold text-slate-900">{displayName}</h3>
              <p className="text-sm text-slate-500">{selected.matricNumber ?? '—'}</p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <p className="text-xs font-semibold text-slate-500">Program e-Kesatuan</p>
              <p className="text-2xl font-bold font-display tabular-nums text-slate-900">
                {studentApps.length}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 border-t border-slate-100 pt-5">
            {butiran.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 min-w-0">
                <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                  <p
                    className={`text-sm ${value ? 'text-slate-900 font-medium' : 'text-slate-300'}`}
                  >
                    {value ?? 'Tiada maklumat'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Program e-Kesatuan pelajar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-display text-lg font-bold text-slate-900 mb-4">Program e-Kesatuan</h3>
          {studentApps.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Tiada permohonan program lagi.</p>
          ) : (
            <div className="space-y-2">
              {studentApps.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {[a.id, a.applicantPosition, a.category, a.organizingLevel]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span className="text-xs tabular-nums text-slate-500">{a.startDate}</span>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusChipCls(a.status)}`}
                  >
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profil bakat penuh */}
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 mb-3">Profil Bakat</h3>
          <BakatProfile
            studentId={selected.uid}
            studentName={displayName}
            matricNumber={selected.matricNumber}
            faculty={selected.faculty}
            college={selected.college}
            showHeader
          />
        </div>
      </div>
    );
  }

  // ── Direktori ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight flex items-center gap-2">
          <Users2 className="w-6 h-6 text-indigo-600" /> Profil Pelajar
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Direktori semua pelajar — klik mana-mana pelajar untuk melihat butiran diri, program dan
          profil bakat mereka.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Cari nama, no. matrik, fakulti, kolej, program pengajian..."
          className="w-full border border-slate-300 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <p className="text-xs text-slate-400 mb-3">{displayedRows.length} pelajar</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                <th className="py-2.5 pr-3 font-semibold">Pelajar</th>
                <th className="py-2.5 pr-3 font-semibold">Fakulti · Kolej</th>
                <th className="py-2.5 pr-3 font-semibold">Tahun</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Program</th>
                <th className="py-2.5 pr-3 font-semibold">Skor Bakat</th>
                <th className="py-2.5 font-semibold">Kekuatan Utama</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.map(({ user, overall, topStrength, programmeCount }) => (
                <tr
                  key={user.uid}
                  onClick={() => selectStudent(user)}
                  className="border-b border-slate-100 last:border-0 hover:bg-indigo-50/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={(user as { displayName?: string }).displayName || user.name} />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {(user as { displayName?: string }).displayName || user.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {user.matricNumber ?? user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-xs text-slate-600">
                    {[user.faculty, user.college].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="py-3 pr-3 tabular-nums text-slate-700">{user.studyYear ?? '—'}</td>
                  <td className="py-3 pr-3 text-right tabular-nums text-slate-700">
                    {programmeCount}
                  </td>
                  <td className="py-3 pr-3">
                    {overall > 0 ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="font-bold tabular-nums text-slate-900">{overall}</span>
                        <BandChip score={overall} />
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Tiada bukti lagi</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-700">
                    {topStrength ? (
                      competencyName(topStrength.competency_id)
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {displayedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 italic">
                    Tiada pelajar sepadan dengan carian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
