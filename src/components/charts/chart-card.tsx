import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Marco común de una gráfica: título que nombra la serie, descripción y contenido. */
export function ChartCard({
  title,
  description,
  aside,
  className,
  children,
}: {
  title: string;
  description?: string;
  /** Dato destacado a la derecha del título (por ejemplo, el total del período). */
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6',
        className,
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0 text-right">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function ChartEmpty({ children }: { children: ReactNode }) {
  return (
    <p className="grid min-h-40 place-items-center rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
