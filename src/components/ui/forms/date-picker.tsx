'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import {
  addDays,
  addMonths,
  formatDay,
  longDay,
  monthGrid,
  monthLabel,
  parseDay,
  todayIn,
} from '@/lib/dates';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface DatePickerProps {
  /** Día elegido como AAAA-MM-DD, o '' si no hay. */
  value: string;
  onChange: (value: string) => void;
  'aria-label': string;
  id?: string;
  placeholder?: string;
  /** Día de hoy en la zona de la tienda (AAAA-MM-DD); por defecto, el del navegador. */
  today?: string;
  min?: string;
  max?: string;
  className?: string;
}

interface Placement {
  left: number;
  top?: number;
  bottom?: number;
}

const PANEL_WIDTH = 304;

/**
 * Selector de fecha con calendario propio (reemplaza <input type="date">, cuyo calendario
 * no se puede estilizar). Teclado: flechas mueven el día, Re Pág/Av Pág el mes, Enter elige,
 * Escape cierra.
 */
export function DatePicker({
  value,
  onChange,
  'aria-label': ariaLabel,
  id,
  placeholder = 'dd/mm/aaaa',
  today: todayProp,
  min,
  max,
  className,
}: DatePickerProps) {
  const today = todayProp ?? todayIn();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(value || today);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  const disabled = (day: string) =>
    (min !== undefined && day < min) || (max !== undefined && day > max);

  function openPanel() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const up =
      window.innerHeight - rect.bottom < 380 &&
      rect.top > window.innerHeight - rect.bottom;
    setPlacement({
      left: Math.max(
        8,
        Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8),
      ),
      ...(up
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    });
    setContainer(button.closest('dialog') ?? document.body);
    setFocused(value || today);
    setOpen(true);
  }

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }

  function choose(day: string) {
    if (disabled(day)) return;
    onChange(day);
    close();
  }

  // Al abrir, el foco pasa al día activo; al mover el día activo, lo sigue.
  useEffect(() => {
    if (open)
      panelRef.current
        ?.querySelector<HTMLElement>(`[data-day="${focused}"]`)
        ?.focus();
  }, [open, focused]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !buttonRef.current?.contains(target)
      )
        setOpen(false);
    };
    const scrolled = (event: Event) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const resized = () => setOpen(false);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', resized);
    window.addEventListener('scroll', scrolled, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', resized);
      window.removeEventListener('scroll', scrolled, true);
    };
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, -1),
      PageDown: () => addMonths(focused, 1),
      Home: () =>
        addDays(
          focused,
          -((new Date(`${focused}T00:00:00Z`).getUTCDay() + 6) % 7),
        ),
      End: () =>
        addDays(
          focused,
          6 - ((new Date(`${focused}T00:00:00Z`).getUTCDay() + 6) % 7),
        ),
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setFocused(move());
    } else if (event.key === 'Escape') {
      // El diálogo que contenga el selector no debe cerrarse con este Escape.
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === 'Tab') {
      // El panel se renderiza aparte: al tabular, se cierra y se vuelve al campo.
      event.preventDefault();
      close();
    }
  }

  const days = monthGrid(focused);
  const month = parseDay(focused).m;

  return (
    <>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-label={`${ariaLabel}${value ? `: ${longDay(value)}` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openPanel())}
        className={cn(
          'flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm shadow-xs transition-colors hover:border-muted-foreground/50 focus-visible:border-primary',
          open && 'border-primary ring-2 ring-ring/30',
          className,
        )}
      >
        <span className={cn('truncate', !value && 'text-muted-foreground/80')}>
          {value ? formatDay(value) : placeholder}
        </span>
        <CalendarDays
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground"
        />
      </button>
      {open && placement && container
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label={`Calendario: ${ariaLabel}`}
              onKeyDown={onKeyDown}
              style={{
                position: 'fixed',
                left: placement.left,
                top: placement.top,
                bottom: placement.bottom,
                width: PANEL_WIDTH,
              }}
              className="z-[100] rounded-2xl border border-border bg-card p-3 text-foreground shadow-xl ring-1 ring-black/5"
            >
              <div className="mb-2 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  onClick={() => setFocused(addMonths(focused, -1))}
                  className="grid size-8 place-items-center rounded-lg hover:bg-muted"
                >
                  <ChevronLeft aria-hidden className="size-4" />
                </button>
                <p
                  id={titleId}
                  aria-live="polite"
                  className="text-sm font-semibold"
                >
                  {monthLabel(focused)}
                </p>
                <button
                  type="button"
                  aria-label="Mes siguiente"
                  onClick={() => setFocused(addMonths(focused, 1))}
                  className="grid size-8 place-items-center rounded-lg hover:bg-muted"
                >
                  <ChevronRight aria-hidden className="size-4" />
                </button>
              </div>
              <div
                role="grid"
                aria-labelledby={titleId}
                className="grid grid-cols-7 gap-y-1"
              >
                {WEEKDAYS.map((weekday, i) => (
                  <span
                    key={`${weekday}${i}`}
                    aria-hidden
                    className="py-1 text-center text-[11px] font-semibold text-muted-foreground uppercase"
                  >
                    {weekday}
                  </span>
                ))}
                {days.map((day) => {
                  const selected = day === value;
                  const isToday = day === today;
                  const outside = parseDay(day).m !== month;
                  return (
                    <button
                      key={day}
                      type="button"
                      role="gridcell"
                      data-day={day}
                      tabIndex={day === focused ? 0 : -1}
                      aria-selected={selected}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={longDay(day)}
                      disabled={disabled(day)}
                      onClick={() => choose(day)}
                      className={cn(
                        'mx-auto grid size-9 place-items-center rounded-full text-sm tabular-nums transition-colors',
                        'hover:bg-primary/10 focus-visible:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent',
                        outside && 'text-muted-foreground/60',
                        isToday &&
                          !selected &&
                          'font-semibold text-primary ring-1 ring-primary/50',
                        selected &&
                          'bg-primary font-semibold text-primary-foreground hover:bg-primary',
                      )}
                    >
                      {parseDay(day).d}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-sm">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    close();
                  }}
                  className="rounded-md px-2 py-1 font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  Borrar
                </button>
                <button
                  type="button"
                  disabled={disabled(today)}
                  onClick={() => choose(today)}
                  className="rounded-md px-2 py-1 font-semibold text-primary hover:bg-primary/10 disabled:opacity-40"
                >
                  Hoy
                </button>
              </div>
            </div>,
            container,
          )
        : null}
    </>
  );
}
