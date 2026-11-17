/**
 * Aritmética decimal exacta sobre cadenas, sin `number`. Existe solo para mostrar
 * estimaciones en pantalla (p. ej. el subtotal de un carrito antes de cobrar); los
 * totales, impuestos y descuentos oficiales los calcula siempre el servidor.
 */

const PATTERN = /^-?\d+(\.\d+)?$/;

interface Scaled {
  value: bigint;
  scale: number;
}

function parse(text: string): Scaled {
  if (!PATTERN.test(text)) throw new Error(`Decimal inválido: ${text}`);
  const negative = text.startsWith('-');
  const [whole = '0', fraction = ''] = text.replace('-', '').split('.');
  const value = BigInt(`${whole}${fraction}`);
  return { value: negative ? -value : value, scale: fraction.length };
}

function format({ value, scale }: Scaled): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value)
    .toString()
    .padStart(scale + 1, '0');
  const whole = digits.slice(0, digits.length - scale);
  const fraction = digits.slice(digits.length - scale);
  return `${negative ? '-' : ''}${whole}${scale ? `.${fraction}` : ''}`;
}

export const isDecimal = (text: string): boolean => PATTERN.test(text);

/** Cambia el signo de un decimal (el cero queda sin signo). */
export function negateDecimal(text: string): string {
  const n = parse(text);
  return format({ value: -n.value, scale: n.scale });
}

export function subtractDecimal(a: string, b: string): string {
  return addDecimal(a, negateDecimal(b));
}

export function addDecimal(a: string, b: string): string {
  const x = parse(a);
  const y = parse(b);
  const scale = Math.max(x.scale, y.scale);
  const lift = (n: Scaled) => n.value * 10n ** BigInt(scale - n.scale);
  return format({ value: lift(x) + lift(y), scale });
}

export function multiplyDecimal(a: string, b: string): string {
  const x = parse(a);
  const y = parse(b);
  return format({ value: x.value * y.value, scale: x.scale + y.scale });
}

export function compareDecimal(a: string, b: string): -1 | 0 | 1 {
  const x = parse(a);
  const y = parse(b);
  const scale = Math.max(x.scale, y.scale);
  const left = x.value * 10n ** BigInt(scale - x.scale);
  const right = y.value * 10n ** BigInt(scale - y.scale);
  return left === right ? 0 : left < right ? -1 : 1;
}

/** Redondea half-up a `places` decimales (solo para presentación). */
export function roundDecimal(text: string, places: number): string {
  const n = parse(text);
  if (n.scale <= places)
    return format({
      value: n.value * 10n ** BigInt(places - n.scale),
      scale: places,
    });
  const drop = 10n ** BigInt(n.scale - places);
  const negative = n.value < 0n;
  const abs = negative ? -n.value : n.value;
  const rounded = (abs + drop / 2n) / drop;
  return format({ value: negative ? -rounded : rounded, scale: places });
}
