import { useEffect, useMemo, useState } from 'react';
import { Award, Loader2, Sparkles, Info } from 'lucide-react';
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
import TalentRadar, { RadarDatum } from './TalentRadar';
import EvidenceRow from './EvidenceRow';
import StatusChip from './StatusChip';

interface BakatProfileProps {
  studentId: string;
  studentName?: string;
  // Pelajar boleh mempertikai evidence sendiri; paparan admin adalah baca-sahaja.
  canDispute?: boolean;
}

// Profil Bakat — Talent Radar + drill-down evidence + Lejar Evidence.
// IRON RULE: skor TIDAK diambil dari storan; ia dikira semula di sini,
// pada masa nyata, daripada evidence 'approved' sahaja.
export default function BakatProfile({ studentId, studentName, canDispute = false }: BakatProfileProps) {
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

  const radarData: RadarDatum[] = useMemo(
    () =>
      TAXONOMY.map((c) => ({
        code: c.code,
        label: c.name_ms,
        score: scores.find((s) => s.competency_id === c.code)?.score ?? 0,
      })),
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

  const topStrengths = useMemo(
    () =>
      [...scores]
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [scores]
  );

  const handleDispute = async (id: string) => {
    try {
      await disputeEvidenceDoc(id);
      setNotification('Evidence ditanda sebagai dipertikai. Skor telah dikira semula tanpa evidence ini.');
      setTimeout(() => setNotification(null), 4000);
      await fetchEvidence();
    } catch (error) {
      console.error('Error disputing evidence:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const hasEvidence = evidence.length > 0;

  return (
    <div className="space-y-6">
      {notification && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm font-medium">
          {notification}
        </div>
      )}

      {/* Ringkasan kekuatan utama */}
      {topStrengths.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {topStrengths.map((s, i) => (
            <div key={s.competency_id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <Award className={`w-4 h-4 ${i === 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                Kekuatan #{i + 1}
              </div>
              <p className="mt-2 font-display text-lg font-bold text-slate-900">
                {competencyName(s.competency_id)}
              </p>
              <p className="text-3xl font-bold text-blue-600 tabular-nums font-display">{s.score}</p>
            </div>
          ))}
        </div>
      )}

      {!hasEvidence ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-display text-lg font-bold text-slate-900 mb-2">Profil bakat belum bermula</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Evidence bakat dijana secara automatik apabila program yang {studentName ? `diurus oleh ${studentName}` : 'anda uruskan'} diluluskan
            sepenuhnya dan laporan pasca programnya disahkan oleh Unit Pelaporan. Mohon dan laksanakan
            program melalui modul Permohonan untuk mula membina profil bakat.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Radar */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-display text-lg font-bold text-slate-900">Radar Bakat</h3>
              <p className="text-xs text-slate-500 mb-2">Klik mana-mana paksi untuk melihat evidence di sebaliknya.</p>
              <TalentRadar
                data={radarData}
                active={active}
                onAxisClick={setActive}
                ariaSummary={`Radar bakat 16 kompetensi. Skor ${competencyName(active)}: ${breakdown.score}.`}
              />
            </div>

            {/* Drill-down evidence */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-baseline justify-between">
                <h3 className="font-display text-lg font-bold text-slate-900">
                  Evidence: {competencyName(active)}
                </h3>
                <span className="font-display text-2xl font-bold tabular-nums text-blue-600">
                  {breakdown.score}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                Jumlah sumbangan di bawah adalah TEPAT sama dengan skor paksi — tiada skor tersembunyi.
              </p>
              <div className="space-y-2">
                {breakdown.contributions.length === 0 && nonContributing.length === 0 && (
                  <p className="py-6 text-center text-sm text-slate-500">
                    Tiada evidence untuk kompetensi ini lagi.
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
          </div>

          {/* Lejar Evidence */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-display text-lg font-bold text-slate-900">Lejar Evidence</h3>
            <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              Setiap skor diterbitkan daripada rekod evidence yang tidak boleh diubah — dijana automatik
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
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        title="Lihat drill-down kompetensi ini"
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
                      Pertikai
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
