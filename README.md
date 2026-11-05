# SNOP — Sistema de Gestión de Club de Tenis de Mesa

Aplicación web fullstack para gestionar socios, turnos de entrenamiento, clases particulares, juego libre y torneos de un club de tenis de mesa.

---

## Requisitos previos

- **Node.js 20.19+ o 22.12+** (`node -v`)
- **npm 10+** (`npm -v`)
- Cuenta en [Supabase](https://supabase.com) con la base de datos ya creada
- (Opcional) Cuenta en [Brevo](https://app.brevo.com) para el envío de emails transaccionales

---

## Variables de entorno

Copiá `.env.example` a `.env` y completá los valores:

```bash
cp .env.example .env
```

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `SUPABASE_URL` | ✅ | URL de tu proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | ✅ | Service role key (solo backend, nunca al cliente) |
| `JWT_SECRET` | ✅ | String largo y aleatorio. Generá uno con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | — | Puerto del backend (default: `3000`) |
| `CORS_ORIGINS` | — | Orígenes permitidos separados por coma (default: `http://localhost:5173`) |
| `VITE_API_URL` | — | URL del backend para el frontend. Default `/api`: en dev el proxy de Vite lo manda a `localhost:3000`. En Vercel, URL completa de Railway |
| `BREVO_FROM_EMAIL` / `BREVO_FROM_NAME` | — | Remitente verificado en Brevo |
| `FRONTEND_URL` | — | URL pública del frontend, usada en links de email |
| `BREVO_API_KEY` | — | API key de Brevo. Sin ella, los emails se loguean en consola |
| `NODE_ENV` | — | Solo en Railway: `production`. **No** setearlo en el `.env` local: con `development`, `vite build` genera React de desarrollo |

> ⚠️ El servidor **no arranca** si falta `JWT_SECRET`, `SUPABASE_URL` o `SUPABASE_SERVICE_KEY`.

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar backend + frontend en paralelo (modo desarrollo)
npm run dev:all

# Solo backend (Express con nodemon)
npm run server

# Solo frontend (Vite)
npm run dev
```

El frontend corre en `http://localhost:5173` y el backend en `http://localhost:3000`.

---

## Build de producción

```bash
# Build del frontend (genera dist/)
npm run build

# Linter JS (frontend + backend + tests)
npm run lint

# Colores hex sueltos fuera de src/index.css (.css y estilos inline .jsx)
npm run lint:css

# Tests (vitest)
npm test

# Todo junto: lint + lint:css + tests + build (lo mismo que corre CI)
npm run check
```

Antes de cerrar cualquier tarea: `npm run check` sin errores. Si tocaste el backend, además levantalo (`npm run server`) y probá `GET /api/sedes`.

CI: `.github/workflows/ci.yml` corre `npm run check` en cada push a `main` y en cada PR.

---

## Base de datos

El esquema real (tablas, columnas, decisiones) está en [`docs/esquema.md`](docs/esquema.md). Al 2026-11-05 todas las migraciones están aplicadas; el registro de cada una está al final de `docs/esquema.md`.

Para un cambio de esquema nuevo: SQL idempotente con ROLLBACK comentado → revisarlo → ejecutarlo en el SQL Editor de Supabase → actualizar `docs/esquema.md`.

---

## Estructura de carpetas

```
SNOP/
├── rutas/               — routers Express (backend, un archivo por dominio)
├── src/
│   ├── components/      — componentes React reutilizables
│   │   └── ui/          — sistema de diseño (Button, Spinner, EmptyState, ErrorState, ConfirmDialog, CategoriaBadge...)
│   ├── config/db.js     — cliente Supabase único (service key)
│   ├── constants/       — datos canónicos (8 categorías)
│   ├── context/         — AuthContext, ThemeContext
│   ├── hooks/           — hooks custom de React
│   ├── lib/             — helpers compartidos (apiClient, errores, fecha, responder...)
│   ├── middlewares/     — autenticar.js + requireRole
│   ├── pages/           — páginas organizadas por rol
│   └── services/        — capa de acceso a datos del frontend
├── .github/workflows/   — CI (npm run check)
├── scripts/             — herramientas de desarrollo (lint-css.mjs)
├── tests/               — tests vitest (lógica pura + sintaxis del backend)
├── docs/                — contexto del proyecto, esquema BD, spec
├── server.js            — entry point del backend
└── .env.example         — plantilla de variables de entorno
```

---

## Roles de usuario

| `tipo_usuario_id` | Rol | Descripción |
|-------------------|-----|-------------|
| `1` | Socio | Puede reservar turnos, unirse a juego libre/torneos, ver perfil y créditos |
| `2` | Entrenador | Gestiona sus clases, horarios, alumnos y solicitudes de inscripción |
| `3` | Admin | Gestiona socios, turnos, bonos, comunicados, actividades y exportaciones |

El acceso está controlado por JWT + middleware `requireRole` en cada router.

---

## Reglas de negocio de créditos

Los créditos de recupero son distintos de los bonos mensuales:

1. **Generación**: cancelar un turno con **≥ 24 horas de anticipación** genera un crédito de recupero.
2. **Vencimiento**: el crédito vence al final del mes del turno cancelado.
3. **Excepción fin de mes**: si la clase cae en la **última semana del mes**, el crédito se arrastra al mes siguiente.
4. **Semántica**: `usado = true` significa que el crédito fue aplicado a otro turno. `vencido` es un campo calculado en runtime (no persiste en BD): `!usado && fecha_vencimiento < ahora`.
5. **Cancelación del club**: si el entrenador cancela la clase o el admin suspende el turno, cada inscripto pasa a `baja_entrenador` y recibe crédito **sin importar la anticipación**.

## Lista de espera

Cuando se libera un cupo (cancelación del socio, quita del admin o baja de un socio), el **primero** de la lista (orden de llegada) queda **inscripto directamente** y se le avisa. Si no había nadie esperando, se avisa (sin inscribir) a quienes antes estuvieron en ese turno.

## Categorías en juego libre y torneos

El admin elige qué categorías pueden anotarse (ninguna = abierto a todos). El backend lo hace cumplir y el socio ve las categorías habilitadas; si no es la suya, el botón aparece deshabilitado.

---

## Deploy

- **Frontend** → [Vercel](https://vercel.com). Configurar `VITE_API_URL` como variable de entorno en Vercel apuntando al backend. Las pantallas se cargan por partes (`React.lazy`); el CSS va en un solo archivo (`cssCodeSplit: false`) porque las hojas por página son globales.
- **Backend** → [Railway](https://railway.app). Configurar todas las variables del `.env` en Railway. `NODE_ENV=production`.

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite 8, React Router 7, Axios, Lucide React |
| Backend | Express 4.21, Node.js ESM (`type: "module"`) |
| Base de datos | Supabase (PostgreSQL) con service key |
| Estilos | CSS puro + CSS Modules (sin Tailwind) |
| Zona horaria | `America/Argentina/Buenos_Aires` (UTC-3 sin DST) en todo el sistema |
