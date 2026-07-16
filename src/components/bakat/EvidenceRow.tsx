import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Contribution, Evidence } from '../../bakat/domain';
import StatusChip from './StatusChip';

// Satu baris evidence dalam drill-down. Jika 'contribution' diberi (evidence
// diluluskan & menyumbang), baris boleh dikembang untuk menunjukkan formula
// points × peranan × peringkat × kehadiran × recency. Jika tidak, papar nota
// dikecualikan daripada skor.
export default function EvidenceRow({
  evidence,
  contribution,
  onDispute,
}: {
  key?: string; // @types/react tiada dalam projek ini; 'key' perlu diisytihar
  evidence: Evidence;
  contribution?: Contribution;
  onDispute?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const contributes = !!contribution;
  const date = evidence.event_date.slice(0, 10);

  return (
    <div
      className={`rounded-xl border border-slate-200 ${
        evidence.status === 'disputed' || evidence.status === 'void' ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        {contributes ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-0.5 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-expanded={open}
            aria-label="Pecahan sumbangan"
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="mt-0.5 w-5" aria-hidden />
        )}

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium text-slate-900 ${
              evidence.status === 'disputed' ? 'line-through' : ''
            }`}
          >
            {evidence.narrative}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="tabular-nums">{date}</span>
            <StatusChip status={evidence.status} />
            {!contributes && evidence.status !== 'void' && (
              <span className="italic">Tidak dikira dalam skor</span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {contributes && (
            <span className="tabular-nums text-sm font-semibold text-emerald-600">
              +{contribution!.effective.toFixed(1)}
            </span>
          )}
          {onDispute && evidence.status === 'approved' && (
            <button
              onClick={() => onDispute(evidence.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Pertikai
            </button>
          )}
        </div>
      </div>

      {open && contribution && (
        <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs rounded-b-xl">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            <Factor label="Mata" value={contribution.evidence.points.toFixed(1)} />
            <Factor label="Peranan" value={`× ${contribution.roleMult.toFixed(2)}`} />
            <Factor label="Peringkat" value={`× ${contribution.levelMult.toFixed(2)}`} />
            <Factor label="Kehadiran" value={`× ${contribution.attendance.toFixed(2)}`} />
            <Factor label="Recency" value={`× ${contribution.decay.toFixed(2)}`} />
            <Factor label="Sumbangan" value={`= ${contribution.effective.toFixed(1)}`} strong />
          </div>
        </div>
      )}
    </div>
  );
}

function Factor({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold text-emerald-600' : 'text-slate-700'}`}>
        {value}
      </span>
    </div>
  );
}
