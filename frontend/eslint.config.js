import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Archivos que corren en Node (config de Vite/Vitest y scripts de desarrollo)
const archivosNode = [
  'vite.config.js',
  'vitest.config.js',
  'scripts/**/*.mjs',
]

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),

  // ── Código de la app (navegador) ────────────────────────────────────────────
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Recomendación de perf de react-hooks v7: no bloquear el build.
      // Es válido llamar setState en un effect cuando se carga data de una API.
      'react-hooks/set-state-in-effect': 'warn',
      // Permitir params de catch sin usar y vars/args prefixed con '_'
      'no-unused-vars': [
        'error',
        {
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      // Los contextos exportan provider + hook: desactivar fast-refresh ahí
      'react-refresh/only-export-components': 'off',
    },
  },

  // ── Archivos de Node: globals de Node explícitos ────────────────────────────
  {
    files: archivosNode,
    languageOptions: {
      globals: globals.node,
    },
  },

  // ── Tests (vitest con globals: true) ────────────────────────────────────────
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },
])
