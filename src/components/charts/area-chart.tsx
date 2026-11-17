'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { ColumnPoint } from './column-chart';

const GRID_STEPS = 4;
const TOP_PAD = 10; // % libre arriba para el pico y el tooltip

function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const f = value / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 4 ? 4 : f <= 8 ? 8 : 10) * pow;
}

/** Curva suave que nunca “rebota” bajo cero ni sobrepasa los datos (monótona de Fritsch–Carlson). */
function smoothPath(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n === 0) return '';
  if (n === 1) return `M${xs[0]},${ys[0]}`;
  const dx = xs.slice(1).map((x, i) => x - xs[i]!);
  const slope = ys.slice(1).map((y, i) => (y - ys[i]!) / dx[i]!);
  const tangent: number[] = [slope[0]!];
  for (let i = 1; i < n - 1; i++)
    tangent.push(
      slope[i - 1]! * slope[i]! <= 0 ? 0 : (slope[i - 1]! + slope[i]!) / 2,
    );
  tangent.push(slope[n - 2]!);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i]! / slope[i]!;
    const b = tangent[i + 1]! / slope[i]!;
    const h = Math.hypot(a, b);
    if (h > 3) {
      tangent[i] = (3 * a * slope[i]!) / h;
      tangent[i + 1] = (3 * b * slope[i]!) / h;
    }
  }
  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const w = dx[i]! / 3;
    d += ` C${xs[i]! + w},${ys[i]! + tangent[i]! * w} ${xs[i + 1]! - w},${ys[i + 1]! - tangent[i + 1]! * w} ${xs[i + 1]},${ys[i + 1]}`;
  }
  return d;
}

/**
 * Línea suave con área degradada. El punto más reciente queda marcado; al pasar el mouse
 * (o con las flechas del teclado) aparece una guía vertical y una “píldora” con el valor.
 */
export function AreaChart({
  points,
  format,
  formatAxis,
  ariaLabel,
  height = 240,
}: {
  points: ColumnPoint[];
  format: (value: number) => string;
  formatAxis?: (value: number) => string;
  ariaLabel: string;
  height?: number;
}) {
  const gradient = useId();
  const plot = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const n = points.length;
  const max = niceCeil(Math.max(...points.map((p) => p.value), 0));
  const unit = max / GRID_STEPS;
  const axis = formatAxis ?? format;
  const xOf = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const yOf = (v: number) => 100 - (v / max) * (100 - TOP_PAD);
  const xs = points.map((_, i) => xOf(i));
  const ys = points.map((p) => yOf(p.value));
  const line = smoothPath(xs, ys);
  const area = n > 1 ? `${line} L100,100 L0,100 Z` : '';
  const every = n <= 8 ? 1 : Math.ceil(n / 7);
  const shown = active ?? n - 1;

  function pick(clientX: number) {
    const rect = plot.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * (n - 1)));
  }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight')
      setActive((i) => Math.min(n - 1, (i ?? n - 1) + 1));
    else if (event.key === 'ArrowLeft')
      setActive((i) => Math.max(0, (i ?? n - 1) - 1));
    else return;
    event.preventDefault();
  }

  const point = points[shown];
  const leftHalf = shown < n / 2;

  return (
    <div role="group" aria-label={ariaLabel}>
      <div className="flex gap-2" style={{ height }}>
        <div
          aria-hidden
          className="relative w-14 shrink-0 text-[11px] text-muted-foreground tabular-nums"
        >
          {Array.from({ length: GRID_STEPS + 1 }, (_, i) => i * unit).map(
            (tick) => (
              <span
                key={tick}
                className="absolute right-0 translate-y-1/2"
                style={{ bottom: `${(tick / max) * (100 - TOP_PAD)}%` }}
              >
                {axis(tick)}
              </span>
            ),
          )}
        </div>
        <div
          ref={plot}
          tabIndex={0}
          role="img"
          aria-label={`${ariaLabel}. Usa las flechas para recorrer los puntos.`}
          onMouseMove={(e) => pick(e.clientX)}
          onMouseLeave={() => setActive(null)}
          onFocus={() => setActive((i) => i ?? n - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={onKeyDown}
          className="relative min-w-0 flex-1 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {Array.from({ length: GRID_STEPS + 1 }, (_, i) => i * unit).map(
            (tick) => (
              <div
                key={tick}
                aria-hidden
                className={cn(
                  'absolute inset-x-0 border-t',
                  tick === 0
                    ? 'border-chart-grid'
                    : 'border-dashed border-chart-grid/70',
                )}
                style={{ bottom: `${(tick / max) * (100 - TOP_PAD)}%` }}
              />
            ),
          )}
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0"
                  stopColor="var(--chart-1)"
                  stopOpacity="0.32"
                />
                <stop offset="1" stopColor="var(--chart-1)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {area ? <path d={area} fill={`url(#${gradient})`} /> : null}
            <path
              d={line}
              fill="none"
              stroke="var(--chart-1)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {point ? (
            <>
              <span
                aria-hidden
                className="absolute inset-y-0 w-px bg-chart-1/40"
                style={{ left: `${xOf(shown)}%` }}
              />
              <span
                aria-hidden
                className="absolute size-3 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-card bg-chart-1 shadow"
                style={{
                  left: `${xOf(shown)}%`,
                  bottom: `${100 - yOf(point.value)}%`,
                }}
              />
              <div
                aria-hidden
                className={cn(
                  'pointer-events-none absolute z-10 w-max max-w-48 -translate-y-full rounded-xl bg-chart-1 px-3 py-1.5 text-xs text-white shadow-lg',
                  leftHalf
                    ? 'translate-x-3'
                    : '-translate-x-[calc(100%+0.75rem)]',
                )}
                style={{
                  left: `${xOf(shown)}%`,
                  top: `calc(${yOf(point.value)}% - 0.6rem)`,
                }}
              >
                <p className="opacity-85">{point.title}</p>
                <p className="text-sm font-semibold tabular-nums">
                  {format(point.value)}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex gap-2" aria-hidden>
        <div className="w-14 shrink-0" />
        <div className="relative h-4 min-w-0 flex-1">
          {points.map((p, i) =>
            i % every === 0 ? (
              <span
                key={p.key}
                className="absolute -translate-x-1/2 text-[11px] whitespace-nowrap text-muted-foreground"
                style={{
                  left: `${xOf(i)}%`,
                  ...(i === 0 ? { transform: 'none' } : {}),
                  ...(i === n - 1 ? { transform: 'translateX(-100%)' } : {}),
                }}
              >
                {p.label}
              </span>
            ) : null,
          )}
        </div>
      </div>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.title}</th>
              <td>{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
