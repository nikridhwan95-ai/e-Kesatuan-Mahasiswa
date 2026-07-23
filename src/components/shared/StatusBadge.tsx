// Lencana status berkongsi — SATU pemetaan warna/label untuk semua status
// permohonan dan laporan (sebelum ini 6+ pelaksanaan berbeza; status yang
// sama dipaparkan dengan warna berlainan di skrin berlainan).
import React from 'react';

const STATUS_STYLES: Record<string, string> = {
  // Permohonan
  Draf: 'bg-slate-100 text-slate-700 border-slate-200',
  'Menunggu Semakan': 'bg-blue-50 text-blue-700 border-blue-200',
  'Perlu Pembetulan': 'bg-amber-50 text-amber-700 border-amber-200',
  'Menunggu Pembentangan': 'bg-purple-50 text-purple-700 border-purple-200',
  'Menunggu Kelulusan YDP': 'bg-amber-50 text-amber-700 border-amber-200',
  'Menunggu Kelulusan TNC HEPA': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Lulus Sepenuhnya': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Ditolak: 'bg-red-50 text-red-700 border-red-200',
  Dibatalkan: 'bg-slate-100 text-slate-500 border-slate-200',
  'Menunggu Semakan Pindaan': 'bg-blue-50 text-blue-700 border-blue-200',
  'Menunggu Kelulusan YDP (Pindaan)': 'bg-amber-50 text-amber-700 border-amber-200',
  // Laporan
  Tertunggak: 'bg-amber-50 text-amber-700 border-amber-200',
  Dihantar: 'bg-blue-50 text-blue-700 border-blue-200',
  Disahkan: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function StatusBadge({
  status,
  label,
  className = '',
}: {
  status: string;
  label?: string; // label paparan pilihan (lalai: nilai status itu sendiri)
  className?: string;
}) {
  const style = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-700 border-slate-200';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${style} ${className}`}
    >
      {label ?? status}
    </span>
  );
}
