'use client';

import { Moon, Sun } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark';
const KEY = 'theme';
const listeners = new Set<() => void>();

function current(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', callback);
  return () => {
    listeners.delete(callback);
    media.removeEventListener('change', callback);
  };
}

/** Alterna entre tema claro y oscuro y recuerda la elección en este navegador. */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore<Theme>(subscribe, current, () => 'light');
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <Button
      variant="outline"
      size={compact ? 'sm' : 'md'}
      className={compact ? 'size-9 px-0' : undefined}
      aria-label={
        next === 'dark' ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro'
      }
      title={next === 'dark' ? 'Tema oscuro' : 'Tema claro'}
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(KEY, next);
        } catch {
          /* almacenamiento no disponible: el cambio vale para esta visita */
        }
        listeners.forEach((notify) => notify());
      }}
    >
      {theme === 'dark' ? (
        <Sun aria-hidden className="size-4" />
      ) : (
        <Moon aria-hidden className="size-4" />
      )}
      {compact
        ? null
        : next === 'dark'
          ? 'Cambiar a tema oscuro'
          : 'Cambiar a tema claro'}
    </Button>
  );
}
