'use client';

import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

/** Fallo inesperado o servicio caído: se ofrece reintentar sin perder la sesión. */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="max-w-md space-y-3">
        <h1 className="text-lg font-semibold">No pudimos cargar tu tienda</h1>
        <p className="text-sm text-muted-foreground">
          El servicio no respondió. Tu sesión sigue abierta; inténtalo de nuevo
          en unos segundos.
        </p>
        <Button onClick={reset}>
          <RefreshCw aria-hidden className="size-4" />
          Reintentar
        </Button>
      </Card>
    </main>
  );
}
