import { describe, expect, it } from 'vitest';
import {
  cartReducer,
  estimateSubtotal,
  isCartValid,
  isLineValid,
  type CartLine,
} from '@/features/sales/cart';

const agua = { variantId: 'a', sku: 'AGUA', name: 'Agua', price: '2.50' };
const arroz = { variantId: 'b', sku: 'ARROZ', name: 'Arroz', price: '4.80' };

const add = (state: CartLine[], line = agua) =>
  cartReducer(state, { type: 'add', line });

describe('carrito', () => {
  it('agrega un artículo con cantidad 1 y sin descuento', () => {
    expect(add([])).toEqual([{ ...agua, quantity: '1', discountRate: '0' }]);
  });

  it('agregar de nuevo el mismo artículo suma una unidad', () => {
    const cart = add(add(add([])));
    expect(cart).toHaveLength(1);
    expect(cart[0]!.quantity).toBe('3');
  });

  it('suma sobre cantidades fraccionarias sin perder exactitud', () => {
    const base = cartReducer(add([]), {
      type: 'quantity',
      variantId: 'a',
      quantity: '0.7',
    });
    expect(add(base)[0]!.quantity).toBe('1.7');
  });

  it('edita cantidad y descuento, quita y vacía', () => {
    let cart = add(add([], arroz));
    cart = cartReducer(cart, {
      type: 'quantity',
      variantId: 'a',
      quantity: '4',
    });
    cart = cartReducer(cart, {
      type: 'discount',
      variantId: 'a',
      discountRate: '10',
    });
    expect(cart.find((l) => l.variantId === 'a')).toMatchObject({
      quantity: '4',
      discountRate: '10',
    });
    cart = cartReducer(cart, { type: 'remove', variantId: 'b' });
    expect(cart.map((l) => l.variantId)).toEqual(['a']);
    expect(cartReducer(cart, { type: 'clear' })).toEqual([]);
  });

  it('valida cantidades y descuentos con el formato que acepta el servidor', () => {
    const line = (quantity: string, discountRate = '0'): CartLine => ({
      ...agua,
      quantity,
      discountRate,
    });
    expect(isLineValid(line('1'))).toBe(true);
    expect(isLineValid(line('0.333'))).toBe(true);
    expect(isLineValid(line('0'))).toBe(false);
    expect(isLineValid(line(''))).toBe(false);
    expect(isLineValid(line('1.2345'))).toBe(false); // máx. 3 decimales
    expect(isLineValid(line('-1'))).toBe(false);
    expect(isLineValid(line('1', '100'))).toBe(true);
    expect(isLineValid(line('1', '100.5'))).toBe(false);
    expect(isCartValid([])).toBe(false);
    expect(isCartValid([line('2')])).toBe(true);
  });

  it('estima el subtotal con aritmética exacta e ignora líneas inválidas', () => {
    let cart = add([]);
    cart = cartReducer(cart, {
      type: 'quantity',
      variantId: 'a',
      quantity: '3',
    });
    cart = add(cart, arroz);
    expect(estimateSubtotal(cart)).toBe('12.30'); // 3×2.50 + 1×4.80
    cart = cartReducer(cart, {
      type: 'quantity',
      variantId: 'a',
      quantity: 'x',
    });
    expect(estimateSubtotal(cart)).toBe('4.80');
  });
});
