import { CheckCircle2, Clock, AlertTriangle, Ban } from 'lucide-react';
import { EvidenceStatus } from '../../bakat/domain';

// Status sentiasa = warna + ikon + teks (tidak pernah warna sahaja).
const MAP: Record<EvidenceStatus, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  approved: {
    icon: CheckCircle2,
    cls: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    label: 'Diluluskan',
  },
  pending: { icon: Clock, cls: 'text-amber-700 border-amber-200 bg-amber-50', label: 'Menunggu' },
  disputed: {
    icon: AlertTriangle,
    cls: 'text-red-700 border-red-200 bg-red-50',
    label: 'Dipertikaikan',
  },
  void: { icon: Ban, cls: 'text-slate-500 border-slate-200 bg-slate-100', label: 'Dibatalkan' },
};

export default function StatusChip({ status }: { status: EvidenceStatus }) {
  const { icon: Icon, cls, label } = MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </span>
  );
}
