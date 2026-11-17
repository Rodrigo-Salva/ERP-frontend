'use client';

import { OpenSessionGate } from '@/features/cash';
import { PosView } from '@/features/sales';

/**
 * Composición entre features a nivel de app: vender exige una caja abierta. Vive en un
 * componente de cliente porque la caja se entrega a PosView mediante una función, y las
 * funciones no pueden pasar de un componente de servidor a uno de cliente.
 */
export function PosScreen() {
  return (
    <OpenSessionGate>
      {(session) => <PosView session={session} />}
    </OpenSessionGate>
  );
}
