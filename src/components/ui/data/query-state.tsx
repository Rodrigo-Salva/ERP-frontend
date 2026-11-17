import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function LoadingBlock({ label = 'Cargando' }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
      ))}
    </div>
  );
}

export function ErrorBlock({
  error,
  onRetry,
}: {
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <Card role="alert" className="space-y-3">
      <p className="font-medium">No se pudo cargar la información</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </Card>
  );
}

export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="px-6 py-14 text-center">
      <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Inbox aria-hidden className="size-6" />
      </span>
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Card>
  );
}

interface QueryStateProps<T> {
  query: {
    data: T | undefined;
    error: Error | null;
    isPending: boolean;
    refetch: () => unknown;
  };
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}

/** Resuelve los tres estados que toda pantalla debe cubrir: carga, error y vacío. */
export function QueryState<T>({
  query,
  isEmpty,
  empty,
  children,
}: QueryStateProps<T>) {
  if (query.isPending) return <LoadingBlock />;
  if (query.error)
    return <ErrorBlock error={query.error} onRetry={() => query.refetch()} />;
  const data = query.data as T;
  if (isEmpty?.(data))
    return <>{empty ?? <EmptyBlock title="Sin resultados" />}</>;
  return <>{children(data)}</>;
}
