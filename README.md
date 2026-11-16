# SNOP — Sistema de Gestión de Club de Tenis de Mesa

Aplicación web fullstack para gestionar socios, turnos de entrenamiento, clases particulares, juego libre y torneos de un club de tenis de mesa.

- **Versión online:** https://snop-psi.vercel.app
- El proyecto está dividido en dos partes independientes, cada una con su `package.json` y su `.env`:

```
SNOP/
├── backend/     — API REST (Node.js + Express) conectada a Supabase   → http://localhost:3000
├── frontend/    — interfaz web (React + Vite)                         → http://localhost:5173
├── database/    — esquema de la base de datos (esquema.sql)
├── docs/        — contexto técnico, esquema explicado, spec
└── scripts/     — armar-entrega.mjs (genera los zips de la entrega)
```

---

## Requisitos

- **Node.js 20.19+ o 22.12+** (recomendado: la versión LTS de https://nodejs.org). Verificar con `node -v`.
- **npm 10+** (viene con Node). Verificar con `npm -v`.
- Un proyecto de **Supabase** con la base cargada (ver [Base de datos](#base-de-datos)).
- (Opcional) Cuenta de **Brevo** para enviar emails. Sin ella, los emails se muestran en la consola del backend.

---

## Instalación paso a paso

Se necesitan **dos terminales**: una para el backend y otra para el frontend.

### 1. Backend

```bash
cd backend
cp .env.example .env      # en Windows (cmd): copy .env.example .env
```

Completar `backend/.env` (ver [Variables de entorno](#variables-de-entorno)) y después:

```bash
npm install
npm run dev
```

Tiene que aparecer `Servidor corriendo en puerto 3000`. Para comprobarlo, abrir http://localhost:3000/api/sedes: tiene que mostrar un JSON con las sedes.

### 2. Frontend (en otra terminal)

```bash
cd frontend
cp .env.example .env      # en Windows (cmd): copy .env.example .env
npm install
npm run dev
```

Abrir **http://localhost:5173** e iniciar sesión.

> En desarrollo el frontend manda todas las llamadas a `/api` y Vite las redirige al backend en `localhost:3000` (proxy en `frontend/vite.config.js`). Por eso el backend tiene que estar corriendo en el puerto 3000.

---

## Variables de entorno

### `backend/.env`

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `SUPABASE_URL` | ✅ | URL del proyecto Supabase (Project Settings → API) |
| `SUPABASE_SERVICE_KEY` | ✅ | Clave `service_role` (secreta, solo backend) |
| `JWT_SECRET` | ✅ | String largo y aleatorio. Generar con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PORT` | — | Puerto del backend (default `3000`) |
| `CORS_ORIGINS` | — | Orígenes permitidos separados por coma (default `http://localhost:5173`) |
| `FRONTEND_URL` | — | URL del frontend, para los links de los emails |
| `BREVO_API_KEY` | — | API key de Brevo. Sin ella, los emails se loguean en consola |
| `BREVO_FROM_EMAIL` / `BREVO_FROM_NAME` | — | Remitente verificado en Brevo |
| `NODE_ENV` | — | Solo en el servidor de producción: `production` |

> ⚠️ El backend **no arranca** si falta `JWT_SECRET`, `SUPABASE_URL` o `SUPABASE_SERVICE_KEY`.

### `frontend/.env`

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | `/api` en desarrollo (usa el proxy de Vite). En producción, la URL completa del backend, ej. `https://snop-backend.up.railway.app/api` |

---

## Base de datos

PostgreSQL en **Supabase**. La estructura completa está en [`database/esquema.sql`](database/esquema.sql), y explicada tabla por tabla en [`docs/esquema.md`](docs/esquema.md).

**Crear la base en un proyecto de Supabase nuevo:**

1. Crear el proyecto en https://supabase.com.
2. Abrir **SQL Editor → New query**, pegar el contenido de `database/esquema.sql` (o de un dump con datos) y tocar **Run**.
3. En **Project Settings → API Keys** copiar la URL del proyecto y la clave `service_role` a `backend/.env`.

**Exportar la base** (esquema + datos) sin necesitar `pg_dump` ni Docker:

```bash
cd backend
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres" npm run exportar-bd -- snop.sql
# agregar --sin-datos para exportar solo la estructura
```

La `DATABASE_URL` sale de Supabase → **Connect → Direct → Session pooler**.

---

## Calidad: lint, tests y build

```bash
cd backend  && npm run check    # eslint + tests (vitest)
cd frontend && npm run check    # eslint + lint:css + tests + build
```

CI: `.github/workflows/ci.yml` corre `npm run check` en las dos carpetas en cada push a `main` y en cada PR.

---

## Roles de usuario

| `tipo_usuario_id` | Rol | Qué puede hacer |
|-------------------|-----|-----------------|
| `1` | Socio | Reservar turnos, unirse a juego libre y torneos, ver perfil y créditos |
| `2` | Entrenador | Gestionar sus clases, horarios, alumnos y solicitudes |
| `3` | Admin | Gestionar socios, turnos, bonos, comunicados, actividades y exportaciones |

El acceso está controlado por JWT + middleware `requireRole` en cada router.

---

## Reglas de negocio

**Créditos de recupero** (distintos de los bonos mensuales):

1. Cancelar un turno con **≥ 24 horas de anticipación** genera un crédito de recupero.
2. El crédito vence al final del mes del turno cancelado.
3. Si la clase cae en la **última semana del mes**, el crédito pasa al mes siguiente.
4. `usado = true` significa que el crédito se aplicó a otro turno. `vencido` se calcula al vuelo: `!usado && fecha_vencimiento < ahora`.
5. Si el entrenador cancela la clase o el admin suspende el turno, cada inscripto recibe crédito **sin importar la anticipación**.

**Lista de espera:** cuando se libera un cupo, el **primero** de la lista queda inscripto directamente y se le avisa. Si no había nadie esperando, se avisa (sin inscribir) a quienes antes estuvieron en ese turno.

**Categorías en juego libre y torneos:** el admin elige qué categorías pueden anotarse (ninguna = abierto a todos). El backend lo hace cumplir; si no es la categoría del socio, el botón aparece deshabilitado.

---

## Deploy

- **Frontend → Vercel**, con *Root Directory* = `frontend`. Variable `VITE_API_URL` = URL del backend + `/api`.
- **Backend → Railway**, con *Root Directory* = `backend`. Cargar todas las variables de `backend/.env` y `NODE_ENV=production`.

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite 8, React Router 7, Axios, Lucide React |
| Backend | Node.js (ESM) + Express 4, JWT, bcrypt, express-rate-limit, ExcelJS |
| Base de datos | Supabase (PostgreSQL) |
| Emails | Brevo (API transaccional) |
| Estilos | CSS puro + CSS Modules (sin Tailwind) |
| Tests | Vitest |
| Zona horaria | `America/Argentina/Buenos_Aires` (UTC-3) en todo el sistema |
