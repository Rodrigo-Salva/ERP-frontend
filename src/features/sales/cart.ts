import { addDecimal, isDecimal, multiplyDecimal } from '@/lib/decimal';
import type { Decimal } from '@/lib/api/types';

export interface CartLine {
  variantId: string;
  sku: string;
  name: string;
  price: Decimal;
  quantity: string;
  discountRate: string;
}

export type CartAction =
  | { type: 'add'; line: Omit<CartLine, 'quantity' | 'discountRate'> }
  | { type: 'quantity'; variantId: string; quantity: string }
  | { type: 'discount'; variantId: string; discountRate: string }
  | { type: 'remove'; variantId: string }
  | { type: 'clear' };

/** Reductor puro del carrito; agregar un artículo ya presente suma una unidad. */
export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((l) => l.variantId === action.line.variantId);
      if (existing)
        return state.map((l) =>
          l.variantId === existing.variantId
            ? {
                ...l,
                quantity: addDecimal(
                  isDecimal(l.quantity) ? l.quantity : '0',
                  '1',
                ),
              }
            : l,
        );
      return [...state, { ...action.line, quantity: '1', discountRate: '0' }];
    }
    case 'quantity':
      return state.map((l) =>
        l.variantId === action.variantId
          ? { ...l, quantity: action.quantity }
          : l,
      );
    case 'discount':
      return state.map((l) =>
        l.variantId === action.variantId
          ? { ...l, discountRate: action.discountRate }
          : l,
      );
    case 'remove':
      return state.filter((l) => l.variantId !== action.variantId);
    case 'clear':
      return [];
  }
}

const POSITIVE = /^(0|[1-9]\d{0,11})(\.\d{1,3})?$/;
const RATE = /^(0|[1-9]\d?)(\.\d{1,4})?$|^100(\.0{1,4})?$/;

/** Una línea es enviable si cantidad (>0) y descuento tienen formato válido. */
export const isLineValid = (line: CartLine): boolean =>
  POSITIVE.test(line.quantity) &&
  /[1-9]/.test(line.quantity) &&
  RATE.test(line.discountRate);

export const isCartValid = (cart: CartLine[]): boolean =>
  cart.length > 0 && cart.every(isLineValid);

/**
 * Subtotal ESTIMADO (precio × cantidad, sin descuentos ni impuestos) para orientar al
 * cajero mientras arma la venta. El total oficial lo calcula el servidor al cobrar.
 */
export function estimateSubtotal(cart: CartLine[]): Decimal {
  return cart.reduce(
    (sum, line) =>
      isLineValid(line)
        ? addDecimal(sum, multiplyDecimal(line.price, line.quantity))
        : sum,
    '0',
  );
}
