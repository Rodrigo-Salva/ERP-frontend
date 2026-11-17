import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * E2E contra un backend aislado (puerto 3100) y la base de pruebas del backend
 * (TEST_DATABASE_URL), nunca contra la base de desarrollo. Requiere:
 *   - backend compilado (`npm run build` en backend/) y migraciones aplicadas a la base de pruebas
 *   - frontend compilado con todos los módulos: `NEXT_PUBLIC_ALL_MODULES=true npm run build`
 *     (config/modules.ts oculta por fases los módulos aún no entregados)
 */
function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const file = readFileSync(resolve(__dirname, '../backend/.env'), 'utf8');
  const line = file
    .split(/\r?\n/)
    .find((l) => l.startsWith('TEST_DATABASE_URL='));
  if (!line)
    throw new Error('Define TEST_DATABASE_URL (base terminada en _test).');
  return line.slice('TEST_DATABASE_URL='.length).trim();
}

const databaseUrl = testDatabaseUrl();
if (!new URL(databaseUrl).pathname.endsWith('_test'))
  throw new Error(
    'El E2E solo corre contra una base cuyo nombre termine en _test.',
  );

const BACKEND = 'http://127.0.0.1:3100';
const APP = 'http://localhost:5174';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: APP,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node dist/main.js',
      cwd: '../backend',
      url: `${BACKEND}/api/v1/health/live`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: '3100',
        HOST: '127.0.0.1',
        DATABASE_URL: databaseUrl,
        CORS_ORIGINS: APP,
        APP_URL: APP,
        SWAGGER_ENABLED: 'false',
      },
    },
    {
      command: 'node node_modules/next/dist/bin/next start -p 5174',
      url: `${APP}/login`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { BACKEND_URL: BACKEND, APP_ORIGIN: APP },
    },
  ],
});
