import { expect, test, type Page } from '@playwright/test';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Accesos y permisos (FR-01, FR-03, FR-04): invitación por correo, recuperación de
 * contraseña y límites de un cajero. El backend aislado escribe el correo local en
 * backend/.local-mail; la prueba lee ese buzón como lo haría un usuario con su bandeja.
 */
const mailbox = resolve(__dirname, '../../backend/.local-mail');
const unique = Date.now().toString(36);
const ownerEmail = `owner-${unique}@example.test`;
const cashierEmail = `cajero-${unique}@example.test`;
const password = 'clave-e2e-solo-pruebas-2026';
const newPassword = 'otra-clave-e2e-solo-pruebas-2026';

/** Espera el correo enviado a `to` y devuelve su token (sale del fragmento del enlace). */
async function tokenFromMail(to: string): Promise<string> {
  const files: string[] = [];
  try {
    for (let attempt = 0; attempt < 40; attempt++) {
      for (const name of readdirSync(mailbox)) {
        const text = readFileSync(resolve(mailbox, name), 'utf8');
        if (text.startsWith(`To: ${to}\n`)) {
          files.push(name);
          const token = /#token=([A-Za-z0-9_-]{43})/.exec(text)?.[1];
          if (token) return token;
        }
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error(`No llegó el correo para ${to}`);
  } finally {
    for (const name of files) rmSync(resolve(mailbox, name), { force: true });
  }
}

async function login(page: Page, email: string, pass: string) {
  await page.goto('/login');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill(pass);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

test('invitación, permisos de cajero y recuperación de contraseña', async ({
  page,
  browser,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  // El propietario crea su tienda.
  await page.goto('/register');
  await page.getByLabel('Tu nombre').fill('Propietario E2E');
  await page.getByLabel('Correo').fill(ownerEmail);
  await page.getByLabel(/^Contraseña/).fill(password);
  await page.getByLabel('Nombre de la tienda').fill(`Accesos ${unique}`);
  await page.getByLabel('Moneda').fill('PEN');
  await page.getByLabel('Idioma / región').fill('es-PE');
  await page.getByLabel('Zona horaria').fill('America/Lima');
  await page.getByRole('button', { name: 'Crear tienda' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const organizationId = page.url().match(/\/([0-9a-f-]{36})\/dashboard/)![1]!;

  // Lo ve todo: configuración y auditoría incluidas.
  const nav = page.getByRole('navigation', { name: 'Principal' });
  for (const label of ['Compras', 'Configuración', 'Auditoría'])
    await expect(nav.getByRole('link', { name: label })).toBeVisible();

  // Invita a un cajero por correo.
  await page.goto(`/${organizationId}/settings`);
  await page.getByRole('tab', { name: 'Equipo' }).click();
  await page.getByRole('button', { name: 'Invitar usuario' }).click();
  await page.getByLabel('Correo').fill(cashierEmail);
  await page.getByRole('combobox', { name: 'Rol' }).click();
  await page.getByRole('option', { name: 'Cajero' }).click();
  await page.getByRole('button', { name: 'Enviar invitación' }).click();
  await expect(page.getByText('Pendiente')).toBeVisible();

  // El invitado acepta desde otro navegador (sesión independiente).
  const guestContext = await browser.newContext({
    baseURL: 'http://localhost:5174',
  });
  const guest = await guestContext.newPage();
  guest.on('pageerror', (error) => pageErrors.push(error.message));
  const inviteToken = await tokenFromMail(cashierEmail);
  await guest.goto(`/accept-invitation#token=${inviteToken}`);
  await guest.getByLabel('Tu nombre').fill('Cajera E2E');
  await guest.getByLabel(/^Contraseña/).fill(password);
  await guest.getByRole('button', { name: 'Aceptar invitación' }).click();
  await expect(guest.getByText('Invitación aceptada')).toBeVisible();

  // El enlace es de un solo uso.
  await guest.goto('/login');
  await guest.goto(`/accept-invitation#token=${inviteToken}`);
  await guest.getByLabel('Tu nombre').fill('Otra');
  await guest.getByLabel(/^Contraseña/).fill(password);
  await guest.getByRole('button', { name: 'Aceptar invitación' }).click();
  await expect(guest.getByText(/La invitación no es válida/)).toBeVisible();

  // La cajera entra y solo ve lo suyo.
  await login(guest, cashierEmail, password);
  await expect(guest).toHaveURL(/\/dashboard$/);
  const guestNav = guest.getByRole('navigation', { name: 'Principal' });
  await expect(
    guestNav.getByRole('link', { name: 'Punto de venta' }),
  ).toBeVisible();
  for (const label of ['Compras', 'Configuración', 'Auditoría', 'Gastos'])
    await expect(guestNav.getByRole('link', { name: label })).toHaveCount(0);

  // Aunque escriba la dirección, el servidor no le muestra pantallas ajenas.
  for (const path of ['settings', 'audit', 'purchases', 'expenses']) {
    const response = await guest.goto(`/${organizationId}/${path}`);
    expect(response?.status(), path).toBe(404);
  }
  // Ni datos de otra organización.
  const foreign = await guest.goto(
    '/00000000-0000-4000-8000-000000000000/dashboard',
  );
  expect(foreign?.status()).toBe(404);

  // Recuperación de contraseña: enlace de un solo uso que cierra las sesiones previas.
  await guestContext.clearCookies();
  await guest.goto('/forgot-password');
  await guest.getByLabel('Correo de tu cuenta').fill(cashierEmail);
  await guest.getByRole('button', { name: 'Enviar enlace' }).click();
  await expect(guest.getByText('Revisa tu correo')).toBeVisible();

  const resetToken = await tokenFromMail(cashierEmail);
  await guest.goto(`/reset-password#token=${resetToken}`);
  await guest.getByLabel(/^Nueva contraseña/).fill(newPassword);
  await guest.getByRole('button', { name: 'Cambiar contraseña' }).click();
  await expect(guest.getByText('Contraseña actualizada')).toBeVisible();

  await login(guest, cashierEmail, password);
  await expect(
    guest.getByText('Correo o contraseña incorrectos.'),
  ).toBeVisible();
  await login(guest, cashierEmail, newPassword);
  await expect(guest).toHaveURL(/\/dashboard$/);

  // El propietario ve la invitación aceptada y la auditoría de los accesos.
  await page.goto(`/${organizationId}/audit`);
  await expect(page.getByText('invitation.accepted')).toBeVisible();

  await guestContext.close();
  expect(pageErrors, 'errores no controlados en el navegador').toEqual([]);
});
