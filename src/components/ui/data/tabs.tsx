'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabDefinition {
  key: string;
  label: string;
  content: ReactNode;
}

/** Pestañas accesibles (rol tablist/tab/tabpanel, flechas del teclado para moverse). */
export function Tabs({
  tabs,
  initial,
}: {
  tabs: TabDefinition[];
  initial?: string;
}) {
  const id = useId();
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  const index = tabs.findIndex((t) => t.key === active);

  function move(delta: number) {
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (next) {
      setActive(next.key);
      document.getElementById(`${id}-tab-${next.key}`)?.focus();
    }
  }

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto border-b border-border"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') move(1);
          if (event.key === 'ArrowLeft') move(-1);
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`${id}-tab-${tab.key}`}
            type="button"
            role="tab"
            aria-selected={tab.key === active}
            aria-controls={`${id}-panel-${tab.key}`}
            tabIndex={tab.key === active ? 0 : -1}
            onClick={() => setActive(tab.key)}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap',
              tab.key === active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.key}
          id={`${id}-panel-${tab.key}`}
          role="tabpanel"
          aria-labelledby={`${id}-tab-${tab.key}`}
          hidden={tab.key !== active}
          className="pt-4"
        >
          {tab.key === active ? tab.content : null}
        </div>
      ))}
    </div>
  );
}
