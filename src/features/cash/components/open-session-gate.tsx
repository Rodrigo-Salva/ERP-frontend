'use client';

import { useState, type ReactNode } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingBlock, ErrorBlock } from '@/components/ui/data/query-state';
import { Select } from '@/components/ui/forms/select';
import { useOpenCashSessions, type CashSession } from '@/lib/queries/cash';
import { useCashRegisters } from '@/lib/queries/reference';
import { OpenSessionDialog } from './open-session-dialog';

/**
 * Exige una caja abierta antes de mostrar su contenido (p. ej. el punto de venta). Si no
 * hay ninguna, ofrece abrirla; si hay varias (encargados), deja elegir.
 */
export function OpenSessionGate({
  children,
}: {
  children: (session: CashSession) => ReactNode;
}) {
  const { organizationId } = useOrganization();
  const sessions = useOpenCashSessions(organizationId);
  const registers = useCashRegisters(organizationId);
  const [opening, setOpening] = useState(false);
  const [chosen, setChosen] = useState<string>('');

  if (sessions.isPending) return <LoadingBlock label="Buscando caja abierta" />;
  if (sessions.error)
    return (
      <ErrorBlock error={sessions.error} onRetry={() => sessions.refetch()} />
    );

  const open = sessions.data;
  const current = open.find((s) => s.id === chosen) ?? open[0];

  if (!current) {
    return (
      <>
        <Card className="mx-auto max-w-md space-y-3 text-center">
          <h2 className="text-lg font-semibold">No hay una caja abierta</h2>
          <p className="text-sm text-muted-foreground">
            Abre tu caja con el fondo inicial para empezar a vender.
          </p>
          <div className="flex justify-center">
            <Button onClick={() => setOpening(true)}>Abrir caja</Button>
          </div>
        </Card>
        <OpenSessionDialog open={opening} onClose={() => setOpening(false)} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {open.length > 1 ? (
        <div className="flex items-center gap-2 text-sm">
          <label htmlFor="session-picker" className="font-medium">
            Caja:
          </label>
          <Select
            id="session-picker"
            className="w-auto"
            value={current.id}
            onChange={(event) => setChosen(event.target.value)}
          >
            {open.map((session) => (
              <option key={session.id} value={session.id}>
                {registers.data?.find((r) => r.id === session.cashRegisterId)
                  ?.name ?? 'Caja'}{' '}
                — {new Date(session.createdAt).toLocaleString()}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      {children(current)}
    </div>
  );
}
