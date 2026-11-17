'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface DonutItem {
  label: string;
  /** Texto secundario bajo la etiqueta (por ejemplo, el SKU). */
  hint?: string | null;
  value: number;
}

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];
const OTHER = 'var(--chart-other)';
const MAX_SLICES = COLORS.length;

const R = 44;
const C = 2 * Math.PI * R;
const GAP = 1.6; // separación entre porciones, en unidades del perímetro

/** Junta lo que sobra de las 5 primeras porciones en “Otros”. */
type Slice = DonutItem & { other?: boolean };

function fold(items: DonutItem[]): Slice[] {
  const sorted = [...items]
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);
  if (sorted.length <= MAX_SLICES) return sorted;
  const rest = sorted.slice(MAX_SLICES - 1);
  return [
    ...sorted.slice(0, MAX_SLICES - 1),
    {
      label: 'Otros',
      other: true,
      value: rest.reduce((sum, i) => sum + i.value, 0),
    },
  ];
}

/**
 * Anillo con el total al centro y una leyenda con valor y porcentaje. Al pasar el mouse
 * (o enfocar) una fila, su porción se resalta y el centro muestra su valor. El color nunca
 * es el único dato: cada porción está nombrada y cuantificada en la leyenda.
 */
export function DonutChart({
  items,
  format,
  centerLabel,
  ariaLabel,
  className,
}: {
  items: DonutItem[];
  format: (value: number) => string;
  /** Texto bajo el total del centro (por ejemplo, «Total vendido»). */
  centerLabel: string;
  ariaLabel: string;
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const slices = fold(items);
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const colorOf = (i: number) => (slices[i]!.other ? OTHER : COLORS[i]!);
  // Inicio de cada porción = suma de las anteriores.
  const starts = slices.map((_, i) =>
    slices.slice(0, i).reduce((sum, s) => sum + (s.value / total) * C, 0),
  );
  const shownValue = active === null ? total : slices[active]!.value;
  const shownLabel = active === null ? centerLabel : slices[active]!.label;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'flex flex-col items-center gap-6 sm:flex-row sm:items-center',
        className,
      )}
    >
      <div className="relative size-44 shrink-0">
        <svg aria-hidden viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="var(--chart-neutral)"
            strokeWidth="11"
            opacity="0.45"
          />
          {slices.map((slice, i) => {
            const length = (slice.value / total) * C;
            const dash = Math.max(length - (slices.length > 1 ? GAP : 0), 0.5);
            const start = starts[i]!;
            return (
              <circle
                key={slice.label}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={colorOf(i)}
                strokeWidth={active === i ? 14 : 11}
                strokeLinecap="butt"
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-start}
                opacity={active === null || active === i ? 1 : 0.35}
                className="transition-[stroke-width,opacity] duration-200"
              />
            );
          })}
        </svg>
        <div
          aria-hidden
          className="absolute inset-0 grid place-items-center text-center"
        >
          <div className="max-w-[7rem] px-1">
            <p className="text-lg leading-tight font-semibold tabular-nums">
              {format(shownValue)}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {shownLabel}
            </p>
          </div>
        </div>
      </div>
      <ul className="w-full max-w-md min-w-0 flex-1 space-y-1.5">
        {slices.map((slice, i) => (
          <li key={slice.label}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                active === i ? 'bg-muted' : 'hover:bg-muted/60',
              )}
            >
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-[4px]"
                style={{ background: colorOf(i) }}
              />
              <span className="min-w-0 flex-1 truncate font-medium">
                {slice.label}
                {slice.hint ? (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {slice.hint}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {format(slice.value)}
              </span>
              <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {Math.round((slice.value / total) * 100)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
