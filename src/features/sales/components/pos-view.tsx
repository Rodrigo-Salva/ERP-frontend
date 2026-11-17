'use client';

import { useMutation } from '@tanstack/react-query';
import { useReducer, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/data/badge';
import { useOrganization } from '@/components/providers/organization-context';
import { Select } from '@/components/ui/forms/select';
import { useToast } from '@/components/ui/overlays/toast';
import { ErrorBlock, LoadingBlock } from '@/components/ui/data/query-state';
import { PageHeader } from '@/components/ui/page-header';
import type { CashSession } from '@/lib/queries/cash';
import { useCustomers, useWarehouses } from '@/lib/queries/reference';
import { cancelSale, createDraft } from '../api';
import { cartReducer } from '../cart';
import { variantLabel, type Sale } from '../types';
import { CartPanel } from './cart-panel';
import { CheckoutDialog } from './checkout-dialog';
import { ProductSearch } from './product-search';
import { ReceiptDialog } from './receipt-view';

/** Punto de venta: arma el carrito, crea el borrador en el servidor y cobra. */
export function PosView({ session }: { session: CashSession }) {
  const { organizationId } = useOrganization();
  const toast = useToast();
  const warehouses = useWarehouses(organizationId);
  const customers = useCustomers(organizationId);
  const [cart, dispatch] = useReducer(cartReducer, []);
  const [customerId, setCustomerId] = useState('');
  const [draft, setDraft] = useState<Sale | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const warehouse = warehouses.data?.find(
    (w) => w.branchId === session.branchId,
  );

  const prepare = useMutation({
    mutationFn: () =>
      createDraft(organizationId, {
        warehouseId: warehouse!.id,
        cashSessionId: session.id,
        customerId: customerId || undefined,
        lines: cart.map((l) => ({
          variantId: l.variantId,
          quantity: l.quantity,
          discountRate: l.discountRate,
        })),
      }),
    onSuccess: setDraft,
    onError: (error) => toast.error(error.message),
  });

  // Descartar el cobro sin pagar: el borrador se anula para no dejar documentos huérfanos.
  async function discardDraft() {
    const current = draft;
    setDraft(null);
    if (!current) return;
    try {
      await cancelSale(organizationId, current.id, {
        reason: 'Cobro cancelado',
      });
    } catch {
      // Un borrador sin confirmar no afecta stock ni caja; si falla, queda inofensivo.
    }
  }

  if (warehouses.isPending || customers.isPending) return <LoadingBlock />;
  if (warehouses.error)
    return (
      <ErrorBlock
        error={warehouses.error}
        onRetry={() => warehouses.refetch()}
      />
    );
  if (customers.error)
    return (
      <ErrorBlock error={customers.error} onRetry={() => customers.refetch()} />
    );
  if (!warehouse)
    return (
      <p role="alert" className="rounded-lg border border-border p-6 text-sm">
        La sucursal de esta caja no tiene un almacén activo. Pide a un
        administrador que lo configure.
      </p>
    );

  return (
    <>
      <PageHeader
        title="Punto de venta"
        description={`Almacén: ${warehouse.name}`}
        actions={<Badge tone="success">Caja abierta</Badge>}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section
          aria-label="Selección de artículos"
          className="min-w-0 space-y-5 rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="font-semibold">Añadir productos</h2>
          <ProductSearch
            onPick={(variant) =>
              dispatch({
                type: 'add',
                line: {
                  variantId: variant.id,
                  sku: variant.sku,
                  name: variantLabel(variant),
                  price: variant.price,
                },
              })
            }
          />
          <div className="space-y-1.5">
            <label htmlFor="pos-customer" className="text-sm font-medium">
              Cliente (opcional)
            </label>
            <Select
              id="pos-customer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Venta sin cliente</option>
              {customers.data
                ?.filter((c) => !c.archivedAt)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </div>
        </section>
        <section
          aria-label="Carrito"
          className="min-w-0 rounded-2xl border border-border bg-card p-5"
        >
          <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <ShoppingBag aria-hidden className="size-5 text-primary" />
              Venta actual
            </h2>
            <Badge>
              {cart.length} {cart.length === 1 ? 'artículo' : 'artículos'}
            </Badge>
          </div>
          <CartPanel
            cart={cart}
            dispatch={dispatch}
            busy={prepare.isPending}
            onCheckout={() => prepare.mutate()}
          />
        </section>
      </div>

      <CheckoutDialog
        draft={draft}
        onClose={() => void discardDraft()}
        onPaid={(sale) => {
          setDraft(null);
          setReceiptId(sale.id);
          dispatch({ type: 'clear' });
          setCustomerId('');
        }}
      />
      <ReceiptDialog saleId={receiptId} onClose={() => setReceiptId(null)} />
    </>
  );
}
