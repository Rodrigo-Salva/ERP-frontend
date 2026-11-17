import { describe, expect, it } from 'vitest';
import {
  addDecimal,
  compareDecimal,
  isDecimal,
  multiplyDecimal,
  negateDecimal,
  roundDecimal,
  subtractDecimal,
} from '@/lib/decimal';

describe('aritmética decimal exacta', () => {
  it('suma sin errores de coma flotante', () => {
    expect(0.1 + 0.2).not.toBe(0.3); // el problema que se evita
    expect(addDecimal('0.1', '0.2')).toBe('0.3');
    expect(addDecimal('12345678901234.99', '0.01')).toBe('12345678901235.00');
  });

  it('alinea escalas distintas', () => {
    expect(addDecimal('1', '0.005')).toBe('1.005');
    expect(subtractDecimal('10', '0.25')).toBe('9.75');
  });

  it('multiplica precio por cantidad', () => {
    expect(multiplyDecimal('2.50', '2')).toBe('5.00');
    expect(multiplyDecimal('9.99', '0.333')).toBe('3.32667');
    expect(multiplyDecimal('0', '5.5')).toBe('0.0');
  });

  it('maneja negativos y el cero', () => {
    expect(subtractDecimal('5', '8')).toBe('-3');
    expect(negateDecimal('-5')).toBe('5');
    expect(negateDecimal('5')).toBe('-5');
    expect(negateDecimal('0')).toBe('0');
    expect(addDecimal('-0.5', '0.5')).toBe('0.0');
  });

  it('no genera decimales inválidos al restar un negativo (error real del cobro)', () => {
    // Antes se concatenaba "-" a un valor ya negativo y salía "--5".
    const diff = subtractDecimal('0', '5.90');
    expect(isDecimal(diff)).toBe(true);
    expect(negateDecimal(diff)).toBe('5.90');
  });

  it('compara con escalas distintas', () => {
    expect(compareDecimal('1.0', '1')).toBe(0);
    expect(compareDecimal('1.01', '1')).toBe(1);
    expect(compareDecimal('-1', '0.5')).toBe(-1);
  });

  it('redondea half-up solo para presentación', () => {
    expect(roundDecimal('1.005', 2)).toBe('1.01');
    expect(roundDecimal('2.5', 0)).toBe('3');
    expect(roundDecimal('-2.5', 0)).toBe('-3');
    expect(roundDecimal('3', 2)).toBe('3.00');
  });

  it('rechaza entradas que no son decimales', () => {
    expect(isDecimal('12.50')).toBe(true);
    for (const bad of ['', 'abc', '1e5', '--5', '1,5', '1.', '.5'])
      expect(isDecimal(bad), bad).toBe(false);
    expect(() => addDecimal('x', '1')).toThrow();
  });
});
