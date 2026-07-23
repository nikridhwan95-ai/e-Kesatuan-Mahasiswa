import { useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { Table2 } from 'lucide-react';
import { CompetencyCode } from '../../bakat/domain';

export interface RadarDatum {
  code: CompetencyCode;
  label: string; // nama kompetensi (BM)
  score: number; // 0–100
}

// Carta radar bakat SATU siri (satu pelajar). HANYA kompetensi yang berskor
// dipaparkan — kita mahu melihat bakat yang ADA. Skala paksi dilaraskan
// kepada julat skor sebenar (label skala dipaparkan supaya telus). Jika
// kurang 3 kompetensi berskor, jadual dipaparkan (radar tidak bermakna).
export default function TalentRadar({
  data,
  active,
  onAxisClick,
  ariaSummary,
}: {
  data: RadarDatum[]; // hanya skor > 0
  active?: CompetencyCode | null;
  onAxisClick?: (code: CompetencyCode) => void;
  ariaSummary: string;
}) {
  const [showTable, setShowTable] = useState(false);

  // Skala "cantik": gandaan 20 terkecil yang memuatkan skor tertinggi.
  const maxScore = Math.max(0, ...data.map((d) => d.score));
  const niceMax = Math.min(100, Math.max(20, Math.ceil(maxScore / 20) * 20));
  const canRenderRadar = data.length >= 3;

  // Tick paksi tersuai — boleh klik, keadaan aktif diserlah.
  const renderTick = (props: {
    payload: { value: string; index: number };
    x: number;
    y: number;
    textAnchor: string;
  }) => {
    const datum = data[props.payload.index];
    const isActive = active && datum?.code === active;
    return (
      <text
        x={props.x}
        y={props.y}
        textAnchor={props.textAnchor as 'start' | 'middle' | 'end'}
        dominantBaseline="central"
        className={`cursor-pointer select-none ${isActive ? 'fill-indigo-600 font-bold' : 'fill-slate-600'}`}
        style={{ fontSize: 12 }}
        role="button"
        tabIndex={0}
        aria-label={`${datum?.label}: ${datum?.score}`}
        onClick={() => datum && onAxisClick?.(datum.code)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && datum) {
            e.preventDefault();
            onAxisClick?.(datum.code);
          }
        }}
      >
        {props.payload.value}
      </text>
    );
  };

  const table = (
    <table className="w-full text-sm">
      <caption className="sr-only">Kompetensi</caption>
      <thead>
        <tr className="border-b border-slate-200 text-left text-slate-500">
          <th scope="col" className="py-2 font-medium">
            Kompetensi
          </th>
          <th scope="col" className="py-2 text-right font-medium tabular-nums">
            Skor
          </th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.code} className="border-b border-slate-100">
            <td className="py-1.5">
              <button
                className="text-left text-slate-700 hover:text-indigo-600 hover:underline"
                onClick={() => onAxisClick?.(d.code)}
              >
                {d.label}
              </button>
            </td>
            <td className="py-1.5 text-right tabular-nums text-slate-900">{d.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!canRenderRadar) {
    return (
      <figure className="m-0">
        <figcaption className="sr-only">{ariaSummary}</figcaption>
        {table}
        <p className="mt-3 text-xs text-slate-400">
          Carta radar dipaparkan apabila tiga kompetensi atau lebih mempunyai skor.
        </p>
      </figure>
    );
  }

  return (
    <figure className="m-0">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 transition-colors"
          aria-pressed={showTable}
        >
          <Table2 className="h-4 w-4" aria-hidden />
          {showTable ? 'Paparkan carta' : 'Paparkan jadual'}
        </button>
      </div>

      <figcaption className="sr-only">{ariaSummary}</figcaption>

      {!showTable ? (
        <div role="img" aria-label={ariaSummary}>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={data} outerRadius="74%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="label" tick={renderTick as never} />
              <PolarRadiusAxis
                domain={[0, niceMax]}
                tickCount={5}
                angle={90}
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                axisLine={false}
              />
              <Radar
                dataKey="score"
                stroke="#4f46e5"
                strokeWidth={2}
                fill="#4f46e5"
                fillOpacity={0.35}
                isAnimationActive={false}
                dot={{ r: 3.5, fill: '#4f46e5', strokeWidth: 0 }}
              />
            </RadarChart>
          </ResponsiveContainer>
          <p className="text-center text-xs text-slate-400 -mt-1">
            Skala 0–{niceMax} · hanya kompetensi yang mempunyai bukti dipaparkan
          </p>
        </div>
      ) : (
        table
      )}
    </figure>
  );
}
