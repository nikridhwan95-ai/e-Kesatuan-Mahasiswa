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

// Carta radar bakat SATU siri (satu pelajar). Satu hue (biru korporat): tiada
// legend diperlukan (tajuk kad menamakan siri). Menyediakan alternatif jadual
// dan ringkasan aria. Paksi boleh diklik untuk drill-down evidence.
export default function TalentRadar({
  data,
  active,
  onAxisClick,
  ariaSummary,
}: {
  data: RadarDatum[];
  active?: CompetencyCode | null;
  onAxisClick?: (code: CompetencyCode) => void;
  ariaSummary: string;
}) {
  const [showTable, setShowTable] = useState(false);

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
        className={`cursor-pointer select-none ${isActive ? 'fill-indigo-600 font-semibold' : 'fill-slate-500'}`}
        style={{ fontSize: 11 }}
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
          {showTable ? 'Papar carta' : 'Papar jadual'}
        </button>
      </div>

      <figcaption className="sr-only">{ariaSummary}</figcaption>

      {!showTable ? (
        <div role="img" aria-label={ariaSummary}>
          <ResponsiveContainer width="100%" height={340}>
            <RadarChart data={data} outerRadius="70%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="label" tick={renderTick as never} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                dataKey="score"
                stroke="#4f46e5"
                fill="#4f46e5"
                fillOpacity={0.3}
                isAnimationActive={false}
                dot
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">Kompetensi</caption>
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th scope="col" className="py-2 font-medium">Kompetensi</th>
              <th scope="col" className="py-2 text-right font-medium tabular-nums">Skor</th>
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
      )}
    </figure>
  );
}
