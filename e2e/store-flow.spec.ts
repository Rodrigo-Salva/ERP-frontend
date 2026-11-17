import { expect, test, type Page } from '@playwright/test';

/**
 * Flujo demostrable de la especificación (sección 1):
 * registrar tienda → crear producto → recibir mercadería → abrir caja → vender y emitir
 * recibo → cerrar caja → consultar ventas y reportes.
 */
const unique = Date.now().toString(36);
const email = `e2e-${unique}@example.test`;
const password = 'clave-e2e-solo-pruebas-2026';

/** Elige una opción del selector propio (lista desplegable) por su etiqueta o posición. */
async function choose(
  page: Page,
  field: string | RegExp,
  option: string | number,
  exact = false,
) {
  await page.getByRole('combobox', { name: field, exact }).click();
  const options = page.getByRole('option');
  await (
    typeof option === 'number'
      ? options.nth(option)
      : options.filter({ hasText: option }).first()
  ).click();
}

async function go(page: Page, organizationId: string, path: string) {
  await page.goto(`/${organizationId}/${path}`);
}

test('operación completa de una tienda', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  // Cualquier excepción no controlada del navegador es un fallo, aunque la prueba siga.
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
    console.log('PAGEERROR:', error.message);
  });

  // 1. Registro de la tienda (moneda y región explícitas, no asumidas).
  await page.goto('/register');
  await page.getByLabel('Tu nombre').fill('Dueña E2E');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel(/^Contraseña/).fill(password);
  await page.getByLabel('Nombre de la tienda').fill(`Tienda E2E ${unique}`);
  await page.getByLabel('Moneda').fill('PEN');
  await page.getByLabel('Idioma / región').fill('es-PE');
  await page.getByLabel('Zona horaria').fill('America/Lima');
  await page.getByRole('button', { name: 'Crear tienda' }).click();

  await expect(page).toHaveURL(/\/[0-9a-f-]{36}\/dashboard$/);
  const organizationId = page.url().match(/\/([0-9a-f-]{36})\/dashboard/)![1]!;
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();

  // La sesión vive en una cookie httpOnly: el JavaScript de la página no la ve.
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    'erp_session',
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Panel' })).toBeVisible();

  // 2. Unidad y producto.
  await go(page, organizationId, 'products/categories');
  await page.getByRole('tab', { name: 'Unidades de medida' }).click();
  await page.getByRole('button', { name: 'Nueva unidad' }).click();
  await page.getByLabel('Nombre').fill('Unidad');
  await page.getByLabel('Código').fill('und');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('cell', { name: /^Unidad/ })).toBeVisible();

  await go(page, organizationId, 'products');
  await page.getByRole('button', { name: 'Nuevo producto' }).first().click();
  await page.getByLabel('Nombre').fill('Producto sin guardar');
  await page.getByRole('button', { name: 'Cerrar' }).click();
  const discard = page.getByRole('dialog', {
    name: '¿Descartar los cambios?',
  });
  await expect(discard).toBeVisible();
  await discard.getByRole('button', { name: 'Seguir editando' }).click();
  await expect(page.getByLabel('Nombre')).toHaveValue('Producto sin guardar');
  await page.keyboard.press('Escape');
  await expect(discard).toBeVisible();
  await discard.getByRole('button', { name: 'Descartar cambios' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Nuevo producto' }),
  ).not.toBeVisible();

  await page.getByRole('button', { name: 'Nuevo producto' }).first().click();
  await page.getByLabel('Nombre').fill('Agua 500 ml');
  await page.getByLabel('SKU').fill('agua-500');
  await choose(page, 'Unidad', 'Unidad (UND)');
  await page.getByLabel('Costo').fill('1.00');
  await page.getByLabel('Precio de venta').fill('2.50');
  await page.getByLabel('Umbral de stock bajo').fill('2');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('AGUA-500')).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Producto creado' }),
  ).not.toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('products-desktop.png'),
    fullPage: true,
  });

  // 3. Proveedor, orden de compra y recepción.
  await go(page, organizationId, 'purchases');
  await page.getByRole('tab', { name: 'Proveedores' }).click();
  await page.getByRole('button', { name: 'Nuevo proveedor' }).click();
  await page.getByLabel('Nombre').fill('Distribuidora Sur');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(
    page.getByRole('cell', { name: /Distribuidora Sur/ }),
  ).toBeVisible();

  await page.getByRole('tab', { name: 'Órdenes de compra' }).click();
  await page.getByRole('button', { name: 'Nueva orden de compra' }).click();
  await choose(page, 'Proveedor', 'Distribuidora Sur', true);
  await choose(page, 'Almacén de destino', 'Principal');
  await page.getByLabel('Buscar artículo').fill('AGUA');
  await page.getByRole('button', { name: /Agua 500 ml/ }).click();
  await page.getByLabel('Cantidad de Agua 500 ml').fill('10');
  await page.getByRole('button', { name: 'Guardar' }).click();
  const order = page.getByRole('row', { name: /Distribuidora Sur/ });
  await expect(order.getByText('Borrador')).toBeVisible();
  await order.getByRole('button', { name: 'Enviar' }).click();
  await expect(order.getByText('Enviada')).toBeVisible();
  await order.getByRole('button', { name: 'Recibir' }).click();
  await page.getByRole('button', { name: 'Registrar recepción' }).click();
  await expect(order.getByText('Recibida', { exact: true })).toBeVisible();

  // El inventario refleja la recepción una sola vez.
  await go(page, organizationId, 'inventory');
  await expect(
    page.getByRole('row', { name: /Agua 500 ml.*10/ }),
  ).toBeVisible();

  // 4. Sin caja abierta no se puede vender; se abre y se vende.
  await go(page, organizationId, 'sales');
  await expect(page.getByText('No hay una caja abierta')).toBeVisible();
  await page.getByRole('button', { name: 'Abrir caja' }).first().click();
  await choose(page, 'Punto de caja', 1);
  await page.getByLabel('Fondo inicial').fill('100.00');
  await page.getByRole('button', { name: 'Abrir caja' }).last().click();
  await expect(
    page.getByRole('heading', { name: 'Punto de venta' }),
  ).toBeVisible();

  await page.getByLabel('Buscar artículo').fill('AGUA');
  await page.getByRole('button', { name: /Agua 500 ml/ }).click();
  await page.getByLabel('Cantidad de Agua 500 ml').fill('2');
  await expect(
    page.getByRole('status').filter({ hasText: 'Caja abierta' }),
  ).not.toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('pos-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('pos-mobile.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Cobrar' }).click();

  const checkout = page.getByRole('dialog', { name: 'Cobrar venta' });
  await expect(checkout.getByText('Total a cobrar')).toBeVisible();
  await expect(checkout.getByText('S/ 5.00').first()).toBeVisible(); // 2 × 2.50, calculado por el servidor
  await checkout.getByRole('button', { name: 'Confirmar venta' }).click();

  const receipt = page.getByRole('dialog', { name: 'Recibo' });
  await expect(receipt.getByText(/Recibo V-0{7}1/)).toBeVisible();
  await expect(
    receipt.getByText(
      'Recibo interno. No es un comprobante fiscal certificado.',
    ),
  ).toBeVisible();
  await receipt.getByRole('button', { name: 'Cerrar' }).last().click();

  // 5. El stock se descontó y la venta aparece en el historial.
  await go(page, organizationId, 'inventory');
  await expect(page.getByRole('row', { name: /Agua 500 ml.*8/ })).toBeVisible();
  await go(page, organizationId, 'sales/history');
  await expect(page.getByRole('cell', { name: 'V-00000001' })).toBeVisible();
  await expect(
    page.getByRole('row', { name: /V-00000001/ }).getByText('Confirmada'),
  ).toBeVisible();

  // 6. Cierre de caja: esperado = 100 + 5 = 105; se cuentan 104.50 → diferencia visible.
  await go(page, organizationId, 'cash');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
  await expect(
    page.getByText(/Efectivo esperado:\s*S\/\s*105\.00/),
  ).toBeVisible();
  await page.getByLabel('Efectivo contado').fill('104.50');
  await expect(page.getByText(/-S\/\s*0\.50|S\/\s*-0\.50/)).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar caja' }).click();
  await expect(
    page.getByText('Cerrada', { exact: true }).first(),
  ).toBeVisible();

  // 7. Reportes y panel concilian con lo vendido.
  await go(page, organizationId, 'reports');
  await expect(page.getByText('Ventas netas')).toBeVisible();
  await go(page, organizationId, 'dashboard');
  await expect(page.getByText('Número de ventas')).toBeVisible();
  await expect(page.getByRole('cell', { name: /Agua 500 ml/ })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('dashboard-with-sales.png'),
    fullPage: true,
  });

  // 8. Cerrar sesión descarta la cookie y protege las rutas.
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.getByRole('button', { name: 'Sí, salir' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(`/${organizationId}/dashboard`);
  await expect(page).toHaveURL(/\/login$/);

  expect(pageErrors, 'errores no controlados en el navegador').toEqual([]);
});
