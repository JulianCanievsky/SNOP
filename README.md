# SNOP — Sistema de Gestión de Club de Tenis de Mesa

Aplicación web fullstack para gestionar socios, turnos de entrenamiento, clases particulares, juego libre y torneos de un club de tenis de mesa.

---

## Requisitos previos

- **Node.js 20+** (`node -v`)
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
| `VITE_API_URL` | — | URL del backend para el frontend (default: `http://localhost:3000/api`) |
| `FRONTEND_URL` | — | URL pública del frontend, usada en links de email |
| `BREVO_API_KEY` | — | API key de Brevo. Sin ella, los emails se loguean en consola |
| `NODE_ENV` | — | `development` o `production` |

> ⚠️ El servidor **no arranca** si falta `JWT_SECRET`, `SUPABASE_URL` o `SUPABASE_SERVICE_KEY`.

---

## Instalación y desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar backend + frontend en paralelo (modo desarrollo)
npm run dev:all

# Solo backend (Express con nodemon)
npm run dev:server

# Solo frontend (Vite)
npm run dev
```

El frontend corre en `http://localhost:5173` y el backend en `http://localhost:3000`.

---

## Build de producción

```bash
# Build del frontend (genera dist/)
npm run build

# Linter
npm run lint
```

---

## Migraciones de base de datos

Las migraciones están en `migrations/`. Son scripts SQL idempotentes (seguros de correr más de una vez).

**Cómo aplicarlas:**
1. Abrí el [SQL Editor de Supabase](https://supabase.com/dashboard) en tu proyecto
2. Pegá el contenido de cada archivo en orden numérico
3. Ejecutá cada uno

Ver `migrations/README.md` para instrucciones detalladas y el estado de cada migración.

---

## Estructura de carpetas

```
SNOP/
├── rutas/               — routers Express (backend, un archivo por dominio)
├── src/
│   ├── components/      — componentes React reutilizables
│   │   └── ui/          — sistema de diseño (Toast, SearchInput, CategoriaBadge...)
│   ├── config/db.js     — cliente Supabase único (service key)
│   ├── constants/       — datos canónicos (8 categorías)
│   ├── context/         — AuthContext, ThemeContext
│   ├── hooks/           — hooks custom de React
│   ├── lib/             — helpers compartidos (apiClient, errores, fecha, responder...)
│   ├── middlewares/     — autenticar.js + requireRole
│   ├── pages/           — páginas organizadas por rol
│   └── services/        — capa de acceso a datos del frontend
├── migrations/          — SQL versionado e idempotente
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

---

## Deploy

- **Frontend** → [Vercel](https://vercel.com). Configurar `VITE_API_URL` como variable de entorno en Vercel apuntando al backend.
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
