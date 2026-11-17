'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface ColumnPoint {
  key: string;
  /** Texto corto bajo la columna. */
  label: string;
  /** Texto completo del tooltip. */
  title: string;
  value: number;
}

const GRID_STEPS = 4;

/** Máximo “redondo” para que las líneas guía caigan en números limpios. */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const fraction = value / pow;
  const step =
    fraction <= 1
      ? 1
      : fraction <= 2
        ? 2
        : fraction <= 4
          ? 4
          : fraction <= 8
            ? 8
            : 10;
  return step * pow;
}

/**
 * Columnas con eje y líneas guía recesivas. Admite valores negativos (línea base al
 * medio, negativos en el color de peligro y con el signo escrito en el tooltip). Hover o
 * foco por teclado muestran el valor exacto; hay una tabla oculta para lectores de pantalla.
 */
export function ColumnChart({
  points,
  format,
  formatAxis,
  ariaLabel,
  height = 220,
  tone = 'highlight',
  valueLabels = false,
}: {
  points: ColumnPoint[];
  format: (value: number) => string;
  formatAxis?: (value: number) => string;
  ariaLabel: string;
  height?: number;
  /**
   * highlight: columnas neutras y la mayor (o la que está bajo el mouse) en el color de
   * marca. sign: positivo en ámbar, negativo en rojo, cero neutro.
   */
  tone?: 'highlight' | 'sign';
  /** Escribe el valor sobre cada columna (útil con pocas columnas). */
  valueLabels?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const peak = points.reduce(
    (best, p, i) => (p.value > (points[best]?.value ?? -Infinity) ? i : best),
    0,
  );
  const colorOf = (value: number, index: number) =>
    tone === 'sign'
      ? value > 0
        ? 'var(--chart-3)'
        : value < 0
          ? 'var(--chart-1)'
          : 'var(--chart-neutral)'
      : index === (active ?? peak) && value > 0
        ? 'var(--chart-1)'
        : 'var(--chart-neutral)';
  const maxPositive = Math.max(...points.map((p) => p.value), 0);
  const maxNegative = Math.abs(Math.min(...points.map((p) => p.value), 0));
  // Paso “redondo” común: las líneas guía caen en 0 y en múltiplos limpios del paso.
  const unit = niceCeil(Math.max(maxPositive, maxNegative)) / GRID_STEPS;
  const maxValue = Math.max(Math.ceil(maxPositive / unit), 1) * unit;
  const low = -Math.ceil(maxNegative / unit) * unit;
  const range = maxValue - low || 1;
  const zero = (-low / range) * 100;
  const axis = formatAxis ?? format;
  const every = points.length <= 12 ? 1 : Math.ceil(points.length / 8);
  const ticks = Array.from(
    { length: Math.round(range / unit) + 1 },
    (_, i) => low + i * unit,
  );

  return (
    <div role="group" aria-label={ariaLabel}>
      <div className="flex gap-2" style={{ height }}>
        <div
          aria-hidden
          className="relative w-14 shrink-0 text-[11px] text-muted-foreground tabular-nums"
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${((tick - low) / range) * 100}%` }}
            >
              {axis(tick)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          {ticks.map((tick) => (
            <div
              key={tick}
              aria-hidden
              className={cn(
                'absolute inset-x-0 border-t',
                tick === 0
                  ? 'border-chart-grid'
                  : 'border-dashed border-chart-grid/70',
              )}
              style={{ bottom: `${((tick - low) / range) * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex">
            {points.map((point, index) => {
              const size = Math.max((Math.abs(point.value) / range) * 100, 1);
              const leftHalf = index < points.length / 2;
              return (
                <div
                  key={point.key}
                  tabIndex={0}
                  role="img"
                  aria-label={`${point.title}: ${format(point.value)}`}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  className={cn(
                    'relative h-full min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active === index && 'bg-muted/60',
                  )}
                >
                  {point.value !== 0 ? (
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-x-[16%] mx-auto max-w-10 transition-[height,background-color] duration-300',
                        point.value > 0 ? 'rounded-t-lg' : 'rounded-b-lg',
                      )}
                      style={{
                        height: `${size}%`,
                        background: colorOf(point.value, index),
                        bottom:
                          point.value > 0 ? `${zero}%` : `${zero - size}%`,
                      }}
                    >
                      {valueLabels && point.value > 0 ? (
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[11px] font-semibold whitespace-nowrap tabular-nums">
                          {format(point.value)}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className="absolute inset-x-[30%] h-0.5 rounded bg-chart-neutral"
                      style={{ bottom: `${zero}%` }}
                    />
                  )}
                  {active === index ? (
                    <div
                      aria-hidden
                      className={cn(
                        'pointer-events-none absolute top-1 z-10 w-max max-w-44 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg',
                        leftHalf ? 'left-full ml-1' : 'right-full mr-1',
                      )}
                    >
                      <p className="text-muted-foreground">{point.title}</p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums">
                        {format(point.value)}
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 flex gap-2" aria-hidden>
        <div className="w-14 shrink-0" />
        <div className="flex min-w-0 flex-1">
          {points.map((point, index) => (
            <span
              key={point.key}
              className="min-w-0 flex-1 text-center text-[11px] whitespace-nowrap text-muted-foreground"
            >
              {index % every === 0 ? point.label : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
