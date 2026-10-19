import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Archivos que corren en Node (backend Express + scripts de server)
const archivosBackend = [
  'server.js',
  'vite.config.js',
  'rutas/**/*.js',
  'src/config/**/*.js',
  'src/controllers/**/*.js',
  'src/middlewares/**/*.js',
  'src/services/**/*.js',
  'src/lib/notificaciones.js',
  'src/lib/responder.js',
]

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'build_*.txt', 'lint_*.txt', 'npm_out.txt']),

  // ── Config común (browser + node) ──────────────────────────────────────────
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
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

  // ── Backend: globals de Node explícitos ─────────────────────────────────────
  {
    files: archivosBackend,
    languageOptions: {
      globals: globals.node,
    },
  },
])
