# Frontend del ERP

Interfaz web con **Next.js 16 (App Router)**, React 19, TypeScript estricto, Tailwind CSS 4, TanStack Query y React Hook Form + Zod. Consume la API del [backend](../backend/README.md); la especificación está en [ERP-SPEC.md](../docs/ERP-SPEC.md).

Es un proyecto independiente: su propio `package.json`, configuración y pruebas viven dentro de `frontend/`. Backend y frontend solo se comunican por HTTP.

## Estado actual

Cubre todas las pantallas del alcance de la primera versión. Cada una consume el backend real y respeta sus permisos:

| Módulo | Qué permite | Quién lo ve |
|---|---|---|
| **Acceso** | Registro de tienda, inicio y cierre de sesión, recuperación de contraseña, aceptación de invitaciones | Público |
| **Panel** | Ventas del día, ticket promedio, cajas abiertas, alertas de stock, más vendidos | Todos |
| **Punto de venta** | Buscar o escanear (lector de código de barras), carrito, descuentos, cobro con pagos mixtos y cambio, recibo imprimible | Propietario, administrador, encargado, cajero |
| **Ventas** | Historial con filtros (folio, estado, fechas), recibo, devoluciones parciales con reintegro explícito, anulación | Ídem (devolver y anular exigen sus permisos) |
| **Caja** | Abrir y cerrar turno con diferencia visible, movimientos manuales, detalle | Ídem |
| **Gastos** | Registrar gastos, opcionalmente pagados desde caja | Propietario, administrador, encargado |
| **Productos** | Alta y edición, variantes (talla, color…), archivado, búsqueda por nombre, SKU o código, filtros | Todos (edita la gestión) |
| **Categorías y unidades** | Gestión con archivado | Todos (edita la gestión) |
| **Inventario** | Existencias, historial de movimientos, stock bajo, ajustes con motivo, transferencias entre almacenes | Todos (ajusta y transfiere la gestión) |
| **Compras** | Proveedores, órdenes de compra, recepción total o parcial con costo real | Propietario, administrador, encargado |
| **Clientes** | Alta con consentimiento obligatorio, edición, archivado | Propietario, administrador, encargado, cajero |
| **Reportes** | Ventas, caja, valoración, movimientos, compras y gastos, con filtros y exportación CSV | Todos (algunos solo gestión) |
| **Auditoría** | Registro de operaciones sensibles con sus cambios | Propietario, administrador |
| **Configuración** | Tienda, impuestos, sucursales, almacenes, métodos de pago, categorías de gasto, equipo (invitaciones y permisos) | Propietario, administrador |

La interfaz oculta lo que el rol no puede hacer, pero **la autorización real la hace siempre el backend**; si se escribe la dirección de una pantalla ajena, el servidor responde 404.

## Requisitos y arranque

- Node.js 24.11.0 (`.nvmrc`) y npm 11.
- El backend en marcha (por omisión `http://127.0.0.1:3000`).

```powershell
Copy-Item .env.example .env    # solo la primera vez
npm ci
npm run dev                    # http://localhost:5173
```

Usa el puerto **5173** porque el backend lo tiene como origen permitido (`CORS_ORIGINS`) y como destino de los enlaces de correo (`APP_URL`). Con los datos de demostración del backend (`npm run db:seed` allí) entras con `demo@example.test`; o crea tu propia tienda en `/register`.

| Variable (solo servidor) | Uso |
|---|---|
| `BACKEND_URL` | Origen del backend, sin ruta. El navegador nunca la ve. |
| `APP_ORIGIN` | Origen público de esta app; valida el origen de las escrituras (CSRF). |
| `SESSION_COOKIE` | Nombre de la cookie de sesión (`erp_session`). |

Ninguna variable lleva el prefijo `NEXT_PUBLIC_`: no se expone configuración al navegador.

## Comprobaciones

```powershell
npm run lint          # ESLint, incluidas las reglas de capas
npm run typecheck
npm run format:check
npm test              # Vitest + Testing Library (unitarias y de componentes)
npm run build
npm run test:e2e      # Playwright en un navegador real (ver abajo)
```

Última verificación: lint sin advertencias, tipos, formato, 46 pruebas unitarias, build de producción (27 rutas) y 2 pruebas E2E aprobadas.

### Pruebas E2E

`npm run test:e2e` levanta **un backend aislado** (puerto 3100, contra la base `*_test` de `backend/.env`; nunca la de desarrollo) y esta aplicación compilada (puerto 5174), y recorre la interfaz en Chromium:

- `e2e/store-flow.spec.ts` — el flujo demostrable de la spec: registrar tienda → crear unidad y producto → proveedor, orden de compra y recepción → comprobar inventario → abrir caja → vender con recibo → comprobar descuento de stock e historial → cerrar caja con diferencia de −0.50 → reportes → cerrar sesión. Además falla si el navegador lanza cualquier excepción no controlada.
- `e2e/access.spec.ts` — invitar a un cajero por correo (el buzón local del backend), aceptar la invitación (un solo uso), comprobar que el cajero no ve ni alcanza compras, configuración, auditoría ni gastos (404) ni otra organización, y recuperar la contraseña con un enlace de un solo uso.

Requisitos: `npm run build` en `backend/` y en `frontend/`, migraciones aplicadas a la base de pruebas (`npm run db:deploy:test` en `backend/`) y, la primera vez, `npx playwright install chromium`.

## Arquitectura

El principio rector es **dependencias en un solo sentido** y **el servidor como autoridad**: el frontend presenta y recoge datos, pero no decide permisos, precios ni totales.

```text
src/
  app/            Rutas de Next: páginas, layouts y route handlers. Solo componen.
  features/       Un directorio por dominio de negocio (auth, sales, cash, catalog, ...).
  components/     Piezas reutilizables sin lógica de negocio (ui/, layout/, contexto, providers).
  lib/            Cliente de API, dinero, esquemas, hooks y consultas de datos de referencia.
  server/         Código que solo corre en el servidor (sesión, BFF, perfil, guardas). `server-only`.
  config/         Configuración declarativa (mapa de navegación por rol).
  proxy.ts        Redirección optimista a /login si no hay cookie.
tests/            Pruebas unitarias y de componentes (espejo de src/).
e2e/              Pruebas de extremo a extremo con Playwright.
```

### Capas y reglas de importación

```text
app  ──►  features  ──►  components / lib
 │
 └────►  server        (solo app importa de server)
```

Las reglas están en `eslint.config.mjs` y **rompen el lint** si se violan:

| Regla | Motivo |
|---|---|
| Una feature no importa a otra feature | Evita el acoplamiento entre dominios; las composiciones viven en `app`. |
| Una feature se importa solo por su API pública (`@/features/sales`, nunca `@/features/sales/components/x`) | Cada feature decide qué expone en su `index.ts`. |
| `components` y `lib` no importan de `features`, `app` ni `server` | Son la base compartida; no pueden depender de lo que las usa. |
| Nada fuera de `app` importa de `app`; solo `app` importa de `server` | El código de servidor no se filtra a los componentes de cliente. |

Cuando dos features necesitan algo común (por ejemplo, las sesiones de caja abiertas que usan Caja y Ventas, o la lista de sucursales), vive en `lib/queries/`. Cuando una pantalla necesita combinar dos features (el punto de venta exige una caja abierta), la composición está en `app` — en un componente de cliente, porque Next no permite pasar funciones de un componente de servidor a uno de cliente (`app/(app)/[organizationId]/sales/pos-screen.tsx`).

### Estructura de una feature

```text
features/<nombre>/
  index.ts          API pública (lo único importable desde fuera)
  api.ts            llamadas al backend y claves de caché
  hooks.ts          useQuery / useMutation de la feature
  types.ts          tipos propios del dominio
  components/       componentes de la feature
```

### Cómo añadir una pantalla

1. Crear `src/features/<nombre>/` con la estructura anterior y exportar solo lo necesario desde `index.ts`.
2. Crear la página en `src/app/(app)/[organizationId]/<segmento>/page.tsx`: valida el rol con `requireRole(...)` y compone la feature.
3. Declararla en `src/config/navigation.ts` (etiqueta, ruta y roles que la ven).
4. Añadir pruebas en `tests/features/` y, si es un flujo crítico, en `e2e/`.

### Sesión y seguridad: patrón BFF

El backend usa un token Bearer opaco. Guardarlo en `localStorage` lo expondría a cualquier XSS, y guardarlo solo en memoria obligaría a renderizar todo en el cliente y perdería la sesión al recargar. En su lugar, **Next.js actúa como backend-for-frontend**:

```text
navegador ──► Next.js (/api/auth/*, /api/bff/*) ──► backend (/api/v1/*)
   cookie httpOnly              añade Authorization: Bearer <token de la cookie>
```

- `/api/auth/login` y `/api/auth/register` llaman al backend y guardan el token en una cookie `httpOnly`, `Secure` (en producción) y `SameSite=Lax`. **El token no se devuelve al navegador.** `/api/auth/logout` revoca la sesión y borra la cookie. `forgot-password`, `reset-password` y `accept-invitation` reenvían formularios públicos (un solo punto, `server/public-auth.ts`).
- `/api/bff/*` reenvía las peticiones del navegador añadiendo el token. Su política (`src/server/bff-policy.ts`) solo permite `GET`/`POST`/`PATCH` sobre `me` y `organizations/<uuid>/…`; **bloquea `/auth`** (devolvería tokens), rutas desconocidas y cualquier segmento con `..`, `.`, `/`, `?` o `\`. Reenvía solo `content-type`, `accept` e `idempotency-key`, y responde con `Cache-Control: no-store`. Los CSV se descargan por esta misma vía.
- **CSRF:** las escrituras exigen que el `Origin` sea `APP_ORIGIN` (o `Sec-Fetch-Site: same-origin`), además de la cookie `SameSite=Lax`.
- Un 401 del backend borra la cookie y el cliente vuelve a `/login` limpiando la caché de datos.
- El layout valida cada organización contra las membresías del usuario (`notFound()` si no pertenece) y cada página valida el rol: la URL no da acceso por sí sola. El backend vuelve a autorizar cada llamada.
- Cabeceras de seguridad globales en `next.config.ts` (CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`).

### Datos, dinero y errores

- **Caché y estado del servidor:** TanStack Query, con claves por organización (`['organizations', id, 'sales', …]`). Solo se reintentan fallos transitorios, no los 4xx. Tras cada mutación se invalidan las consultas afectadas.
- **Dinero y cantidades:** el backend los envía como **cadenas decimales**. El frontend nunca los convierte a `number`: los formatea con `Intl.NumberFormat` (`lib/money.ts`) y, cuando necesita una estimación en pantalla (el subtotal del carrito), usa aritmética decimal exacta sobre cadenas (`lib/decimal.ts`). Totales, impuestos y descuentos oficiales los calcula siempre el servidor al crear el borrador de la venta; el cobro muestra esos valores.
- **Idempotencia:** `useIdempotency()` mantiene una clave estable por intento de usuario: si se reintenta la misma petición (corte de red) la clave se reutiliza y el servidor no duplica la operación; si cambian los datos, cambia la clave. Se usa en abrir y cerrar caja, confirmar ventas, devoluciones, gastos, ajustes, transferencias y recepciones.
- **Permisos en pantalla:** `useOrganization()` expone el rol y `can(permiso)` con los permisos explícitos que devuelve `/me` (`sales.return`, `sales.cancel`, `cash.adjust`, `inventory.adjust`…). Propietario y administrador lo tienen todo.
- **Errores:** toda respuesta de error se normaliza en `ApiError` (estado, mensaje en español, `requestId`) y se muestra en avisos accesibles (`aria-live`).
- **Formularios:** React Hook Form con esquemas Zod; los esquemas de acceso se comparten con las rutas del BFF.
- **Estados de interfaz:** cada pantalla cubre carga, vacío y error con `QueryState`. Formularios con etiquetas, errores asociados con `aria-describedby`, diálogos nativos (`<dialog>`: foco atrapado y Escape), pestañas con teclado y tablas con desplazamiento en móvil. El recibo se imprime con estilos de impresión propios.

## Pendiente

- Integración continua y despliegue (el repositorio aún no está alojado); `output: 'standalone'` y el contenedor de producción se añaden en esa fase.
- Verificación de accesibilidad con una herramienta automática (axe) y de rendimiento con carga (objetivo de la spec: p95 < 500 ms con 50 usuarios).
- Mejoras opcionales del negocio documentadas en el [README del backend](../backend/README.md#mejoras-opcionales-para-más-adelante) (recepción parcial de transferencias, impuesto por producto, descuento sobre el total) y, en la interfaz, formularios de compra con más de un almacén por sucursal.
- Antes de producción: límite de peticiones por IP real (ver abajo) y proveedor de correo.

### Cambios pendientes en el backend

1. **IP real del cliente.** Con el BFF, el backend ve siempre la IP del servidor de Next, así que sus límites de peticiones (registro 5/min, login 10/min, recuperación 5/min) se comparten entre todos los usuarios. Hay que configurar proxies de confianza (`trust proxy`) en el backend y reenviar `X-Forwarded-For` desde el BFF antes de producción.
