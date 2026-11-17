import { describe, expect, it } from 'vitest';
import { formatMoney, formatQuantity } from '@/lib/money';

const nbsp = (text: string) => text.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it('formatea según la moneda y el idioma de la organización', () => {
    expect(nbsp(formatMoney('1234.5', 'PEN', 'es-PE'))).toBe('S/ 1,234.50');
    expect(nbsp(formatMoney('1234.5', 'USD', 'en-US'))).toBe('$1,234.50');
  });

  it('conserva la exactitud decimal de importes largos', () => {
    // Un `number` perdería precisión aquí; la cadena decimal no.
    expect(nbsp(formatMoney('12345678901234.99', 'USD', 'en-US'))).toBe(
      '$12,345,678,901,234.99',
    );
  });

  it('no deforma céntimos que la coma flotante falla', () => {
    expect(nbsp(formatMoney('0.30', 'USD', 'en-US'))).toBe('$0.30');
    expect(nbsp(formatMoney('1.005', 'USD', 'en-US'))).toBe('$1.01');
  });

  it('formatea importes negativos, como una diferencia de caja', () => {
    expect(nbsp(formatMoney('-0.5', 'PEN', 'es-PE'))).toContain('0.50');
    expect(formatMoney('-0.5', 'PEN', 'es-PE')).toContain('-');
  });
});

describe('formatQuantity', () => {
  it('muestra hasta tres decimales sin ceros sobrantes', () => {
    expect(formatQuantity('2.500', 'es-PE')).toBe('2.5');
    expect(formatQuantity('3', 'es-PE')).toBe('3');
    expect(formatQuantity('0.333', 'es-PE')).toBe('0.333');
  });
});
