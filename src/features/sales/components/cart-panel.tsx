'use client';

import { ShoppingBag, Trash2 } from 'lucide-react';
import type { Dispatch } from 'react';
import { useOrganization } from '@/components/providers/organization-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/forms/input';
import {
  estimateSubtotal,
  isCartValid,
  isLineValid,
  type CartAction,
  type CartLine,
} from '../cart';

interface CartPanelProps {
  cart: CartLine[];
  dispatch: Dispatch<CartAction>;
  onCheckout: () => void;
  busy: boolean;
}

export function CartPanel({
  cart,
  dispatch,
  onCheckout,
  busy,
}: CartPanelProps) {
  const { money } = useOrganization();

  if (cart.length === 0)
    return (
      <div className="grid min-h-72 place-items-center rounded-xl bg-muted/30 p-8 text-center">
        <div>
          <span className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-card text-primary shadow-xs">
            <ShoppingBag aria-hidden className="size-7" />
          </span>
          <p className="font-medium">El carrito está vacío</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Busca o escanea un artículo para empezar.
          </p>
        </div>
      </div>
    );

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {cart.map((line) => {
          const valid = isLineValid(line);
          return (
            <li
              key={line.variantId}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_5rem_2.5rem] sm:items-end"
            >
              <div className="col-span-3 min-w-0 sm:col-span-1 sm:self-center">
                <p className="font-medium break-words">{line.name}</p>
                <p className="text-xs text-muted-foreground">
                  {line.sku} · {money(line.price)} c/u
                </p>
              </div>
              <div>
                <label
                  className="mb-1 block text-xs text-muted-foreground"
                  htmlFor={`qty-${line.variantId}`}
                >
                  Cantidad<span className="sr-only"> de {line.name}</span>
                </label>
                <Input
                  id={`qty-${line.variantId}`}
                  inputMode="decimal"
                  value={line.quantity}
                  aria-invalid={!valid}
                  onChange={(e) =>
                    dispatch({
                      type: 'quantity',
                      variantId: line.variantId,
                      quantity: e.target.value,
                    })
                  }
                  className="text-right"
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs whitespace-nowrap text-muted-foreground"
                  htmlFor={`disc-${line.variantId}`}
                >
                  Descuento %<span className="sr-only"> de {line.name}</span>
                </label>
                <Input
                  id={`disc-${line.variantId}`}
                  inputMode="decimal"
                  value={line.discountRate}
                  aria-invalid={!valid}
                  title="Descuento %"
                  onChange={(e) =>
                    dispatch({
                      type: 'discount',
                      variantId: line.variantId,
                      discountRate: e.target.value,
                    })
                  }
                  className="text-right"
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-11 self-end px-2 text-muted-foreground hover:text-danger"
                aria-label={`Quitar ${line.name}`}
                onClick={() =>
                  dispatch({ type: 'remove', variantId: line.variantId })
                }
              >
                <Trash2 aria-hidden className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Subtotal estimado
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {money(estimateSubtotal(cart))}
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Sin descuentos ni impuestos. Verás el total final antes de confirmar
          el pago.
        </p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: 'clear' })}
            disabled={busy}
          >
            Vaciar
          </Button>
          <Button
            className="flex-1"
            onClick={onCheckout}
            disabled={busy || !isCartValid(cart)}
          >
            {busy ? 'Preparando…' : 'Cobrar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
