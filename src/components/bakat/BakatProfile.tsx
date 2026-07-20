import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Info, Loader2, Sparkles } from 'lucide-react';
import {
  CompetencyCode,
  COMPETENCY_CODES,
  Evidence,
  TAXONOMY,
  competencyName,
  recalculateStudent,
  scoreBreakdown,
} from '../../bakat/domain';
import { getEvidenceForStudent, disputeEvidenceDoc } from '../../bakat/evidenceService';
import { overallScore, talentSummary, HIGH_POTENTIAL_THRESHOLD } from '../../bakat/insights';
import TalentRadar, { RadarDatum } from './TalentRadar';
import EvidenceRow from './EvidenceRow';
import StatusChip from './StatusChip';
import { Avatar, BandChip, COMPETENCY_ICON } from './ui';

interface BakatProfileProps {
  studentId: string;
  studentName?: string;
  matricNumber?: string;
  faculty?: string;
  college?: string;
  // Papar kad kepala profil (nama, matrik, skor keseluruhan).
  showHeader?: boolean;
  // Pelajar boleh mempertikai evidence sendiri; paparan admin adalah baca-sahaja.
  canDispute?: boolean;
}

// Profil Bakat — kad profil + Talent Radar + drill-down evidence + Lejar Bukti.
// IRON RULE: skor TIDAK diambil dari storan; ia dikira semula di sini,
// pada masa nyata, daripada bukti 'approved' sahaja.
export default function BakatProfile({
  studentId,
  studentName,
  matricNumber,
  faculty,
  college,
  showHeader = false,
  canDispute = false,
}: BakatProfileProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<CompetencyCode>('LEA');
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchEvidence();
  }, [studentId]);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const data = await getEvidenceForStudent(studentId);
      setEvidence(data);
    } catch (error) {
      console.error('Error fetching evidence:', error);
    } finally {
      setLoading(false);
    }
  };

  const scores = useMemo(
    () => recalculateStudent(studentId, COMPETENCY_CODES, evidence),
    [studentId, evidence]
  );

  // Radar memaparkan HANYA kompetensi yang berskor — bakat yang ada.
  const radarData: RadarDatum[] = useMemo(
    () =>
      TAXONOMY.map((c) => ({
        code: c.code,
        label: c.name_ms,
        score: scores.find((s) => s.competency_id === c.code)?.score ?? 0,
      })).filter((d) => d.score > 0),
    [scores]
  );

  const breakdown = useMemo(
    () => scoreBreakdown(studentId, active, evidence),
    [studentId, active, evidence]
  );

  const nonContributing = useMemo(
    () =>
      evidence.filter(
        (e) => e.student_id === studentId && e.competency_id === active && e.status !== 'approved'
      ),
    [evidence, studentId, active]
  );

  const ledger = useMemo(
    () => [...evidence].sort((a, b) => b.event_date.localeCompare(a.event_date)),
    [evidence]
  );

  const strengths = useMemo(
    () =>
      [...scores]
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4),
    [scores]
  );

  const approved = useMemo(() => evidence.filter((e) => e.status === 'approved'), [evidence]);
  const overall = useMemo(() => overallScore(scores), [scores]);

  // Mulakan perincian pada kekuatan teratas (bukan paksi tanpa skor).
  useEffect(() => {
    if (!loading && strengths[0] && !radarData.some((d) => d.code === active)) {
      setActive(strengths[0].competency_id);
    }
  }, [loading, strengths, radarData, active]);
  const programmeCount = useMemo(() => new Set(approved.map((e) => e.source_id)).size, [approved]);

  // Aktiviti terkini — evidence dikumpul mengikut program (source_id).
  const activities = useMemo(() => {
    const byProgramme = new Map<string, Evidence[]>();
    for (const e of ledger) {
      const arr = byProgramme.get(e.source_id) ?? [];
      arr.push(e);
      byProgramme.set(e.source_id, arr);
    }
    return Array.from(byProgramme.entries()).map(([sourceId, rows]) => {
      // Naratif berformat "Peranan — Tajuk Program"; ambil tajuk selepas ' — '.
      const sample = rows.find((r) => r.narrative.includes(' — ')) ?? rows[0];
      const parts = sample.narrative.split(' — ');
      return {
        sourceId,
        title: parts.length > 1 ? parts.slice(1).join(' — ') : sample.narrative,
        role: rows.find((r) => r.source_type === 'committee_role')?.weight_factors.role,
        date: rows[0].event_date.slice(0, 10),
        count: rows.length,
        competencies: Array.from(new Set(rows.map((r) => r.competency_id))),
      };
    });
  }, [ledger]);

  const handleDispute = async (id: string) => {
    try {
      await disputeEvidenceDoc(id);
      setNotification('Bukti ditandakan sebagai dipertikaikan. Skor telah dikira semula tanpa bukti ini.');
      setTimeout(() => setNotification(null), 4000);
      await fetchEvidence();
    } catch (error) {
      console.error('Error disputing evidence:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const hasEvidence = evidence.length > 0;
  const displayName = studentName ?? 'Pelajar';
  const roleLabel: Record<string, string> = {
    chairperson: 'Pengarah Program',
    secretary: 'Setiausaha Program',
  };

  return (
    <div className="space-y-6">
      {notification && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm font-medium">
          {notification}
        </div>
      )}

      {/* Kad kepala profil */}
      {showHeader && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={displayName} size="lg" />
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl font-bold text-slate-900 truncate">{displayName}</h3>
            <p className="text-sm text-slate-500 truncate">
              {[matricNumber, faculty, college].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <p className="text-xs font-semibold text-slate-500">Skor Bakat Keseluruhan</p>
            <div className="flex sm:justify-end items-center gap-2 mt-1">
              <span className="text-3xl font-bold font-display tabular-nums text-indigo-600">
                {overall > 0 ? overall : '—'}
              </span>
              {overall > 0 && <BandChip score={overall} />}
            </div>
            {overall >= HIGH_POTENTIAL_THRESHOLD && (
              <p className="text-xs font-semibold text-emerald-600 mt-1">Potensi Tinggi</p>
            )}
            <p className="text-[10px] text-slate-400 mt-0.5">purata 3 kekuatan teratas</p>
          </div>
        </div>
      )}

      {!hasEvidence ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display text-lg font-bold text-slate-900 mb-2">Profil bakat belum bermula</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Bukti bakat dijana secara automatik apabila program yang {studentName ? `diurus oleh ${studentName}` : 'anda uruskan'} diluluskan
            sepenuhnya dan laporan pascaprogramnya disahkan oleh Unit Pelaporan. Mohon dan laksanakan
            program melalui modul Permohonan untuk mula membina profil bakat.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
            {/* Radar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-display text-lg font-bold text-slate-900">Radar Bakat</h3>
              <p className="text-xs text-slate-500 mb-2">Bakat yang terbukti sahaja — klik mana-mana paksi untuk melihat bukti di sebaliknya.</p>
              <TalentRadar
                data={radarData}
                active={active}
                onAxisClick={setActive}
                ariaSummary={`Radar bakat 16 kompetensi. Skor ${competencyName(active)}: ${breakdown.score}.`}
              />
            </div>

            <div className="space-y-6">
              {/* Kategori bakat sepadan */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-display text-lg font-bold text-slate-900 mb-4">Kekuatan Utama</h3>
                <div className="space-y-4">
                  {strengths.map((s) => {
                    const Icon = COMPETENCY_ICON[s.competency_id];
                    return (
                      <button
                        key={s.competency_id}
                        onClick={() => setActive(s.competency_id)}
                        className="w-full text-left group"
                      >
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="inline-flex items-center gap-2 font-semibold text-slate-700 group-hover:text-indigo-700 transition-colors">
                            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                              <Icon className="w-4 h-4" />
                            </span>
                            {competencyName(s.competency_id)}
                          </span>
                          <span className="font-bold tabular-nums text-indigo-600">{s.score}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(100, s.score)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ringkasan bakat */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-display text-lg font-bold text-slate-900 mb-2">Ringkasan Bakat</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {talentSummary(studentName, { strengths, approvedCount: approved.length, programmeCount })}
                </p>
                <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> Dikira daripada bukti — bukan janaan AI.
                </p>
              </div>
            </div>
          </div>

          {/* Drill-down evidence */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Bukti: {competencyName(active)}
              </h3>
              <span className="font-display text-2xl font-bold tabular-nums text-indigo-600">
                {breakdown.score}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Jumlah sumbangan di bawah TEPAT sama dengan skor paksi — tiada skor tersembunyi.
            </p>
            <div className="space-y-2">
              {breakdown.contributions.length === 0 && nonContributing.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  Tiada bukti untuk kompetensi ini lagi.
                </p>
              )}
              {breakdown.contributions.map((c) => (
                <EvidenceRow
                  key={c.evidence.id}
                  evidence={c.evidence}
                  contribution={c}
                  onDispute={canDispute ? handleDispute : undefined}
                />
              ))}
              {nonContributing.map((e) => (
                <EvidenceRow key={e.id} evidence={e} />
              ))}
            </div>
          </div>

          {/* Aktiviti terkini */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-display text-lg font-bold text-slate-900 mb-4">Aktiviti Program</h3>
            <div className="space-y-3">
              {activities.map((a) => (
                <div key={a.sourceId} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-4">
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{a.title}</p>
                    <p className="text-xs text-slate-500">
                      {[a.role ? roleLabel[a.role] : null, a.sourceId].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="tabular-nums">{a.date}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">
                      {a.count} bukti
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lejar Bukti */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-display text-lg font-bold text-slate-900">Lejar Bukti</h3>
            <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Setiap skor diterbitkan daripada rekod bukti yang tidak boleh diubah — dijana automatik
              daripada program e-Kesatuan yang lulus sepenuhnya dan laporannya disahkan.
            </p>
            <div className="space-y-2">
              {ledger.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium text-slate-900 ${e.status === 'disputed' ? 'line-through' : ''}`}>
                      {e.narrative}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="tabular-nums">{e.event_date.slice(0, 10)}</span>
                      <button
                        onClick={() => setActive(e.competency_id)}
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                        title="Lihat perincian kompetensi ini"
                      >
                        {competencyName(e.competency_id)}
                      </button>
                      <StatusChip status={e.status} />
                    </div>
                  </div>
                  {canDispute && e.status === 'approved' && (
                    <button
                      onClick={() => handleDispute(e.id)}
                      className="text-xs font-medium text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Pertikaikan
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
