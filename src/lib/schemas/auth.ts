import { z } from 'zod';

const email = z
  .email('Ingresa un correo válido')
  .max(254)
  .transform((value) => value.trim().toLowerCase());

/** Contraseña nueva: el backend exige entre 12 y 128 caracteres. */
const newPassword = z
  .string()
  .min(12, 'Usa al menos 12 caracteres')
  .max(128, 'Máximo 128 caracteres');

/** Token de un solo uso de los enlaces de correo (43 caracteres base64url). */
const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'El enlace no es válido');

/** Credenciales de inicio de sesión; las comparten el formulario y la ruta del BFF. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Ingresa tu contraseña').max(128),
});

export const registerSchema = z.object({
  email,
  password: newPassword,
  name: z.string().trim().min(1, 'Ingresa tu nombre').max(120),
  organizationName: z
    .string()
    .trim()
    .min(1, 'Ingresa el nombre de la tienda')
    .max(160),
  branchName: z
    .string()
    .trim()
    .min(1, 'Ingresa el nombre de la sucursal')
    .max(160),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Código de 3 letras (p. ej. PEN, USD)'),
  locale: z.string().trim().min(2, 'Ingresa el idioma (p. ej. es-PE)').max(35),
  timeZone: z.string().trim().min(1, 'Ingresa la zona horaria').max(80),
});

export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ token, password: newPassword });
export const acceptSchema = z.object({
  token,
  password: newPassword,
  name: z.string().trim().min(1, 'Ingresa tu nombre').max(120),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginPayload = z.output<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;
export type RegisterPayload = z.output<typeof registerSchema>;
export type ForgotInput = z.input<typeof forgotSchema>;
export type ResetInput = z.input<typeof resetSchema>;
export type AcceptInput = z.input<typeof acceptSchema>;
