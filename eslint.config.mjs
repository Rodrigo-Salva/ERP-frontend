import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * Reglas de capas (ver README, «Arquitectura»). Se expresan con `no-restricted-imports`
 * para que un cruce indebido rompa el lint, no solo la revisión de código.
 *
 *   app  →  features  →  components / lib        (nunca al revés)
 *   server  solo lo usa app (rutas, páginas de servidor); nunca features, components ni lib
 *   una feature no importa a otra: las composiciones viven en app
 */
const restrict = (patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

const noDeepFeatureImport = {
  group: ['@/features/*/*'],
  message:
    'Importa una feature solo por su API pública (@/features/<nombre>), no por rutas internas.',
};
const noFeatures = {
  group: ['@/features', '@/features/*'],
  message: 'components y lib no dependen de features.',
};
const noApp = {
  group: ['@/app', '@/app/*'],
  message: 'Nada fuera de app importa de app.',
};
const noServer = {
  group: ['@/server', '@/server/*'],
  message: 'El código de servidor solo se importa desde app.',
};

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores(['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts']),
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: restrict([noDeepFeatureImport]),
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: restrict([
      noApp,
      noServer,
      {
        group: ['@/features', '@/features/*'],
        message:
          'Una feature no importa a otra; compón las features desde app.',
      },
    ]),
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: restrict([noFeatures, noApp, noServer]),
  },
  {
    files: ['src/server/**/*.{ts,tsx}'],
    rules: restrict([noDeepFeatureImport, noApp]),
  },
]);
