'use client';

import { Printer } from 'lucide-react';
import { useOrganization } from '@/components/providers/organization-context';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/overlays/dialog';
import { QueryState } from '@/components/ui/data/query-state';
import { formatQuantity } from '@/lib/money';
import { useReceipt } from '../hooks';
import type { Sale } from '../types';

/** Recibo imprimible. No es un comprobante fiscal: así lo indica el propio documento. */
export function ReceiptView({ sale }: { sale: Sale }) {
  const { money, dateTime, locale } = useOrganization();
  const store = sale.storeSnapshot;

  return (
    <article
      className="print-area space-y-3 text-sm"
      aria-label={`Recibo ${sale.folio ?? ''}`}
    >
      <header className="text-center">
        <h3 className="text-base font-semibold">{store.name}</h3>
        {store.branch ? <p>{store.branch}</p> : null}
        {store.address ? (
          <p className="text-muted-foreground">{store.address}</p>
        ) : null}
        <p className="mt-2 font-medium">Recibo {sale.folio}</p>
        {sale.confirmedAt ? (
          <p className="text-muted-foreground">{dateTime(sale.confirmedAt)}</p>
        ) : null}
      </header>

      <table className="w-full">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-1 font-medium">Artículo</th>
            <th className="py-1 text-right font-medium">Cant.</th>
            <th className="py-1 text-right font-medium">Precio</th>
            <th className="py-1 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.lines.map((line) => (
            <tr key={line.id} className="border-t border-border">
              <td className="py-1">
                {line.name}
                <span className="block text-xs text-muted-foreground">
                  {line.sku}
                </span>
              </td>
              <td className="py-1 text-right tabular-nums">
                {formatQuantity(line.quantity, locale)}
              </td>
              <td className="py-1 text-right tabular-nums">
                {money(line.price)}
              </td>
              <td className="py-1 text-right tabular-nums">
                {money(line.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="space-y-1 border-t border-border pt-2">
        <Row label="Subtotal" value={money(sale.gross)} />
        {/^0(\.0+)?$/.test(sale.discount) ? null : (
          <Row label="Descuento" value={`-${money(sale.discount)}`} />
        )}
        <Row
          label={`Impuestos (${Number(sale.taxRate)}% ${sale.taxIncluded ? 'incluidos' : 'agregados'})`}
          value={money(sale.tax)}
        />
        <Row label="Total" value={money(sale.total)} strong />
        {sale.payments.map((payment) => (
          <Row
            key={payment.id}
            label={payment.methodName}
            value={money(payment.amount)}
          />
        ))}
        <Row label="Cambio" value={money(sale.change)} />
      </dl>
      <p className="text-center text-xs text-muted-foreground">
        Recibo interno. No es un comprobante fiscal certificado.
      </p>
    </article>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${strong ? 'text-base font-semibold' : ''}`}
    >
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** Diálogo que carga y muestra el recibo de una venta por id. */
export function ReceiptDialog({
  saleId,
  onClose,
  footer,
}: {
  saleId: string | null;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const { organizationId } = useOrganization();
  const query = useReceipt(organizationId, saleId);
  return (
    <Dialog
      open={saleId !== null}
      onClose={onClose}
      title="Recibo"
      className="w-[min(92vw,30rem)]"
    >
      <QueryState query={query}>
        {(sale) => (
          <div className="space-y-4">
            <ReceiptView sale={sale} />
            <div className="flex flex-wrap justify-end gap-2 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer aria-hidden className="size-4" /> Imprimir
              </Button>
              {footer}
              <Button onClick={onClose}>Cerrar</Button>
            </div>
          </div>
        )}
      </QueryState>
    </Dialog>
  );
}
