'use client';

import { Check, ChevronDown } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type Ref,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface Choice {
  value: string;
  label: string;
  disabled: boolean;
}

interface Placement {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  ref?: Ref<HTMLSelectElement>;
};

/**
 * Selector con lista propia. Conserva la API de un <select> (hijos <option>, value,
 * onChange, register de react-hook-form): el <select> real sigue existiendo, oculto, como
 * fuente del valor, y la lista visible se lo escribe y dispara su evento `change`.
 */
export function Select({
  className,
  ref,
  id,
  children,
  disabled,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
  ...native
}: SelectProps) {
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [current, setCurrent] = useState('');
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [labelFromPage, setLabelFromPage] = useState<string | undefined>();

  const setRefs = useCallback(
    (element: HTMLSelectElement | null) => {
      selectRef.current = element;
      if (typeof ref === 'function') ref(element);
      else if (ref) ref.current = element;
    },
    [ref],
  );

  // El valor del <select> oculto puede cambiar sin pasar por React (por ejemplo, reset
  // de react-hook-form): se vigila su propiedad `value` y su evento `change`.
  const subscribe = useCallback((notify: () => void) => {
    const element = selectRef.current;
    if (!element) return () => undefined;
    const original = Object.getOwnPropertyDescriptor(
      HTMLSelectElement.prototype,
      'value',
    );
    if (original?.get && original.set) {
      const { get, set } = original;
      Object.defineProperty(element, 'value', {
        configurable: true,
        get() {
          return get.call(this);
        },
        set(next: string) {
          set.call(this, next);
          notify();
        },
      });
    }
    element.addEventListener('change', notify);
    return () => {
      Reflect.deleteProperty(element, 'value');
      element.removeEventListener('change', notify);
    };
  }, []);
  const selectedText = useSyncExternalStore(
    subscribe,
    () => selectRef.current?.selectedOptions[0]?.text ?? '',
    () => '',
  );

  // Sin aria-label propio, el nombre accesible sale de la <label for=id> de la página.
  useEffect(() => {
    if (ariaLabel || !id) return;
    const text = document.querySelector(
      `label[for="${CSS.escape(id)}"]`,
    )?.textContent;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lectura única del DOM
    setLabelFromPage(text?.trim() || undefined);
  }, [ariaLabel, id]);

  function place() {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const up = below < 180 && above > below;
    setPlacement({
      left: rect.left,
      width: rect.width,
      ...(up
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
      maxHeight: Math.min(288, Math.max(120, up ? above : below)),
    });
  }

  function openList() {
    const element = selectRef.current;
    if (!element || disabled) return;
    const list = Array.from(element.options).map((option) => ({
      value: option.value,
      label: option.text,
      disabled: option.disabled,
    }));
    setChoices(list);
    setActive(Math.max(0, element.selectedIndex));
    setCurrent(element.value);
    setContainer(buttonRef.current?.closest('dialog') ?? document.body);
    place();
    setOpen(true);
  }

  function closeList() {
    setOpen(false);
  }

  function choose(index: number) {
    const element = selectRef.current;
    const choice = choices[index];
    if (!element || !choice || choice.disabled) return;
    if (element.value !== choice.value) {
      element.value = choice.value;
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
    closeList();
    buttonRef.current?.focus();
  }

  // Cierra al pulsar fuera, al redimensionar o al desplazar otro contenedor.
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
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', closeList);
    window.addEventListener('scroll', scrolled, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', closeList);
      window.removeEventListener('scroll', scrolled, true);
    };
  }, [open]);

  useEffect(() => {
    if (open)
      panelRef.current
        ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
        ?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function step(from: number, direction: 1 | -1): number {
    for (let i = from + direction; i >= 0 && i < choices.length; i += direction)
      if (!choices[i]!.disabled) return i;
    return from;
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActive((i) => step(i, 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActive((i) => step(i, -1));
        break;
      case 'Home':
        event.preventDefault();
        setActive(step(-1, 1));
        break;
      case 'End':
        event.preventDefault();
        setActive(step(choices.length, -1));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        choose(active);
        break;
      case 'Escape':
        // Evita que el diálogo que contiene el selector se cierre también.
        event.preventDefault();
        event.stopPropagation();
        closeList();
        break;
      case 'Tab':
        closeList();
        break;
      default:
        if (event.key.length === 1) {
          const typed = event.key.toLocaleLowerCase();
          const found = choices.findIndex(
            (choice, i) =>
              i !== active &&
              !choice.disabled &&
              choice.label.toLocaleLowerCase().startsWith(typed),
          );
          if (found >= 0) setActive(found);
        }
    }
  }

  return (
    <div className="relative min-w-0 w-full">
      <select
        {...native}
        ref={setRefs}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
      >
        {children}
      </select>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        aria-labelledby={undefined}
        aria-invalid={ariaInvalid}
        aria-describedby={describedBy}
        title={ariaLabel ? undefined : labelFromPage}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={onKeyDown}
        onBlur={() => {
          closeList();
          // Informa del desenfoque al campo real (por ejemplo, para react-hook-form).
          selectRef.current?.dispatchEvent(
            new FocusEvent('focusout', { bubbles: true }),
          );
        }}
        className={cn(
          'flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm shadow-xs transition-colors hover:border-muted-foreground/50 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger',
          open && 'border-primary ring-2 ring-ring/30',
          className,
        )}
      >
        <span className="truncate">{selectedText || ' '}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && placement && container
        ? createPortal(
            <div
              ref={panelRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel ?? labelFromPage}
              // El foco se queda en el botón: pulsar una opción no debe quitárselo.
              onMouseDown={(event) => event.preventDefault()}
              style={{
                position: 'fixed',
                left: placement.left,
                width: placement.width,
                top: placement.top,
                bottom: placement.bottom,
                maxHeight: placement.maxHeight,
              }}
              className="z-[100] overflow-y-auto rounded-xl border border-border bg-card p-1 text-sm text-foreground shadow-xl ring-1 ring-black/5"
            >
              {choices.map((choice, index) => {
                const selected = choice.value === current;
                return (
                  <div
                    key={`${choice.value}-${index}`}
                    id={`${listId}-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={choice.disabled || undefined}
                    onMouseMove={() => !choice.disabled && setActive(index)}
                    onClick={() => choose(index)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2',
                      index === active && 'bg-primary/10',
                      selected && 'font-semibold text-primary',
                      choice.disabled && 'cursor-not-allowed opacity-45',
                    )}
                  >
                    <span className="truncate">{choice.label}</span>
                    {selected ? (
                      <Check aria-hidden className="size-4 shrink-0" />
                    ) : null}
                  </div>
                );
              })}
            </div>,
            container,
          )
        : null}
    </div>
  );
}
