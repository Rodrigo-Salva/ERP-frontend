import { z } from 'zod';

/** Importe decimal como cadena (nunca número): hasta 14 enteros y 4 decimales, sin signo. */
export const money = z
  .string()
  .trim()
  .regex(
    /^(0|[1-9]\d{0,13})(\.\d{1,4})?$/,
    'Ingresa un importe válido (máx. 4 decimales)',
  );

/** Cantidad positiva con hasta 3 decimales. */
export const quantity = z
  .string()
  .trim()
  .regex(
    /^(0|[1-9]\d{0,11})(\.\d{1,3})?$/,
    'Ingresa una cantidad válida (máx. 3 decimales)',
  )
  .refine((v) => /[1-9]/.test(v), 'Debe ser mayor que cero');

/** Cantidad con signo para ajustes de inventario. */
export const signedQuantity = z
  .string()
  .trim()
  .regex(
    /^-?(0|[1-9]\d{0,11})(\.\d{1,3})?$/,
    'Ingresa una cantidad válida (máx. 3 decimales)',
  )
  .refine((v) => /[1-9]/.test(v), 'No puede ser cero');

export const percentage = z
  .string()
  .trim()
  .regex(
    /^(0|[1-9]\d?)(\.\d{1,4})?$|^100(\.0{1,4})?$/,
    'Ingresa un porcentaje entre 0 y 100',
  );

export const requiredText = (label: string, max = 160) =>
  z
    .string()
    .trim()
    .min(1, `Ingresa ${label}`)
    .max(max, `Máximo ${max} caracteres`);

export const reason = z
  .string()
  .trim()
  .min(3, 'Indica un motivo (mínimo 3 caracteres)')
  .max(300, 'Máximo 300 caracteres');

/** Campo opcional de texto: la cadena vacía se convierte en undefined. */
export const optionalText = (max = 300) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.email('Ingresa un correo válido').optional());
