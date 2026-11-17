import { expect, test, type Page } from '@playwright/test';

async function noHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
}

test('diseño adaptable, navegación móvil y estados vacíos', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('login-desktop.png'),
    fullPage: true,
  });

  await page.goto('/register');
  await page.getByLabel('Tu nombre').fill('María Torres');
  await page.getByLabel('Correo').fill(`design-${Date.now()}@example.test`);
  await page.getByLabel(/^Contraseña/).fill('clave-e2e-solo-pruebas-2026');
  await page.getByLabel('Nombre de la tienda').fill('Bodega La Esquina');
  await page.getByLabel('Moneda').fill('PEN');
  await page.getByLabel('Idioma / región').fill('es-PE');
  await page.getByLabel('Zona horaria').fill('America/Lima');
  await page.getByRole('button', { name: 'Crear tienda' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Tu próxima venta empieza aquí')).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('dashboard-desktop.png'),
    fullPage: true,
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.screenshot({
    path: testInfo.outputPath('dashboard-dark.png'),
    fullPage: true,
  });

  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 390, height: 844 });
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('dashboard-mobile.png'),
    fullPage: true,
  });
  const menu = page.getByRole('button', { name: 'Abrir navegación' });
  await menu.click();
  const dialog = page.getByRole('dialog', { name: 'Tendio' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(menu).toBeFocused();
  await menu.click();
  await dialog.getByRole('link', { name: 'Productos', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Productos', exact: true }),
  ).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Nuevo producto' }).first().click();
  await expect(
    page.getByRole('dialog', { name: 'Nuevo producto' }),
  ).toBeVisible();
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('product-dialog-mobile.png'),
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await menu.click();
  await dialog.getByRole('button', { name: 'Salir' }).click();
  await page.getByRole('button', { name: 'Sí, salir' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await noHorizontalOverflow(page);
  await page.screenshot({
    path: testInfo.outputPath('login-mobile.png'),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
