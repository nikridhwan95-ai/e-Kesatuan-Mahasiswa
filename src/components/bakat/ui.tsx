// Kepingan UI kongsi Modul Bakat — gaya papan pemuka TALENT HUB.
import {
  Brain,
  ClipboardList,
  Cpu,
  Crown,
  FlaskConical,
  Globe,
  Handshake,
  HeartHandshake,
  Laptop,
  Lightbulb,
  LucideIcon,
  MessageSquare,
  Palette,
  Rocket,
  Share2,
  Trophy,
  Wallet,
} from 'lucide-react';
import { CompetencyCode } from '../../bakat/domain';
import { Band, BAND_META, bandOf } from '../../bakat/insights';

export const COMPETENCY_ICON: Record<CompetencyCode, LucideIcon> = {
  LEA: Crown,
  COM: MessageSquare,
  INN: Lightbulb,
  TEC: Cpu,
  ENT: Rocket,
  SPO: Trophy,
  ART: Palette,
  RES: FlaskConical,
  VOL: HeartHandshake,
  CRT: Brain,
  DIG: Laptop,
  GLO: Globe,
  PRJ: ClipboardList,
  FIN: Wallet,
  NEG: Handshake,
  NET: Share2,
};

// Cincin kemajuan (0–100). Warna mengikut jalur prestasi; nilai sentiasa
// dipapar sebagai teks (bukan warna sahaja).
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const hex = BAND_META[bandOf(pct)].hex;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${value}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-slate-900">
        {value}
      </span>
    </div>
  );
}

// Kad statistik dengan ikon + subteks fakta (tiada trend rekaan).
export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconCls = 'bg-indigo-50 text-indigo-600',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  iconCls?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconCls}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 font-display tabular-nums leading-tight">
          {value}
        </p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 leading-snug">{sub}</p>}
      </div>
    </div>
  );
}

export function BandChip({ score }: { score: number }) {
  const band = bandOf(score);
  const meta = BAND_META[band];
  const short: Record<Band, string> = {
    cemerlang: 'Cemerlang',
    baik: 'Baik',
    berkembang: 'Berkembang',
    perlu: 'Perlu Peningkatan',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.chip}`}
    >
      {short[band]}
    </span>
  );
}

const AVATAR_COLORS = [
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
];

export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  const initials =
    name
      .split(/\s+/)
      .filter((w) => /^[A-Za-z]/.test(w))
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?';
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % AVATAR_COLORS.length;
  const cls = size === 'lg' ? 'w-16 h-16 text-xl' : 'w-10 h-10 text-sm';
  return (
    <div
      className={`${cls} ${AVATAR_COLORS[hash]} rounded-full flex items-center justify-center font-bold shrink-0`}
    >
      {initials}
    </div>
  );
}

// Lencana kedudukan 1/2/3 (emas/perak/gangsa), selebihnya nombor biasa.
export function RankBadge({ rank }: { rank: number }) {
  const medal =
    rank === 1
      ? 'bg-amber-400 text-white'
      : rank === 2
        ? 'bg-slate-300 text-slate-700'
        : rank === 3
          ? 'bg-orange-300 text-orange-900'
          : 'bg-slate-100 text-slate-500';
  return (
    <span
      className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${medal}`}
    >
      {rank}
    </span>
  );
}
