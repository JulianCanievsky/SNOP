# SNOP — Sistema de Gestión de Club de Tenis de Mesa

Aplicación web fullstack para gestionar socios, turnos de entrenamiento, clases particulares, juego libre y torneos de un club de tenis de mesa.

- **Versión online:** https://snop-psi.vercel.app
- El proyecto tiene dos partes independientes, cada una con su `package.json` y su `.env`:

```
SNOP/
├── backend/     — API REST (Node.js + Express) conectada a Supabase   → http://localhost:3000
├── frontend/    — interfaz web (React + Vite)                         → http://localhost:5173
├── database/    — esquema.sql (estructura) + datos-iniciales.sql (datos de prueba)
├── docs/        — contexto técnico, esquema explicado, spec
├── scripts/     — armar-entrega.mjs (genera los zips de la entrega)
└── .vscode/     — tareas para instalar y levantar todo desde VS Code
```

---

## Requisitos

| Qué | Para qué | Cómo verificarlo |
|-----|----------|------------------|
| **Node.js 20.19+ o 22.12+** (recomendado: la LTS de https://nodejs.org) | Correr backend y frontend | `node -v` |
| **npm 10+** (viene con Node) | Instalar dependencias | `npm -v` |
| **Visual Studio Code** | Abrir y ejecutar el proyecto | — |
| **Cuenta gratuita en https://supabase.com** | La base de datos (PostgreSQL) | — |

> No hace falta instalar PostgreSQL ni Docker: la base vive en Supabase.

---

## Puesta en marcha (≈ 10 minutos)

### Paso 1 — Abrir el proyecto en VS Code

1. Descomprimir el zip.
2. En VS Code: **File → Open Folder…** y elegir la carpeta `SNOP` (la que contiene `backend/` y `frontend/`).
3. Abrir una terminal: **Terminal → New Terminal** (o `` Ctrl+` ``).

### Paso 2 — Crear la base de datos en Supabase

1. Entrar a https://supabase.com → **New project**. Elegir un nombre, una contraseña para la base (anotarla) y la región más cercana. Esperar 1–2 minutos a que se cree.
2. En el menú de la izquierda ir a **SQL Editor → New query**.
3. Abrir el archivo [`database/esquema.sql`](database/esquema.sql) en VS Code, copiar **todo** su contenido (`Ctrl+A`, `Ctrl+C`), pegarlo en el editor de Supabase y tocar **Run**.
   Tiene que decir *Success. No rows returned*. (Si Supabase pregunta por “operaciones destructivas”, confirmar: la base está vacía.)
4. **New query** otra vez, y hacer lo mismo con [`database/datos-iniciales.sql`](database/datos-iniciales.sql). Esto carga los roles, las 8 categorías, el club, las sedes (Belgrano y Palermo), las mesas y los **usuarios de prueba**.
5. Para comprobarlo: **Table Editor** → tabla `users` tiene que mostrar 4 usuarios.

### Paso 3 — Configurar el backend (`backend/.env`)

1. Copiar el archivo de ejemplo. En la terminal de VS Code, desde la carpeta `SNOP`:

   ```bash
   cd backend
   copy .env.example .env
   ```

   (En Mac/Linux, o en Git Bash: `cp .env.example .env`.) Después volver: `cd ..`

2. Abrir `backend/.env` y completar **estas tres** variables (el resto puede quedar como está):

   | Variable | De dónde sale |
   |----------|---------------|
   | `SUPABASE_URL` | Supabase → **Project Settings → Data API** → *Project URL* (`https://xxxx.supabase.co`) |
   | `SUPABASE_SERVICE_KEY` | Supabase → **Project Settings → API Keys** → la clave **`service_role`** (pestaña *Legacy API keys*) o una **Secret key** (`sb_secret_...`). ⚠️ No usar la `anon`/publishable: con esa no funciona. |
   | `JWT_SECRET` | Cualquier texto largo y aleatorio. Para generarlo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |

   > Sin `BREVO_API_KEY` la app funciona igual: los emails (recuperar contraseña, avisos) se muestran en la terminal del backend en vez de enviarse.

### Paso 4 — Instalar y ejecutar

**Opción A — con las tareas de VS Code (recomendado):**

1. **Terminal → Run Task… → `1. Instalar dependencias`** (solo la primera vez; tarda 1–2 minutos).
2. **Terminal → Run Task… → `2. Iniciar SNOP`** (o `Ctrl+Shift+B`). Se abren dos terminales: backend y frontend.

**Opción B — a mano, con dos terminales:**

```bash
# Terminal 1
cd backend
npm install
npm run dev
```

```bash
# Terminal 2 (botón “+” de la terminal)
cd frontend
npm install
npm run dev
```

### Paso 5 — Usar la app

- En la terminal del backend tiene que aparecer `Servidor corriendo en puerto 3000`.
  Prueba rápida: http://localhost:3000/api/sedes tiene que mostrar `Belgrano` y `Palermo`.
- Abrir **http://localhost:5173** e iniciar sesión con alguno de estos usuarios:

| Rol | Email | Contraseña |
|-----|-------|------------|
| Administrador | `admin@snop.test` | `Snop1234` |
| Entrenador | `entrenador@snop.test` | `Snop1234` |
| Socio (4ª categoría, con bono de 8 clases) | `socio@snop.test` | `Snop1234` |
| Socio (6ª categoría) | `socio2@snop.test` | `Snop1234` |

Recorrido sugerido: entrar como **admin** → *Turnos* → crear un turno de entrenamiento con el entrenador demo → salir y entrar como **socio** → anotarse al turno, al juego libre y al torneo de ejemplo → entrar como **entrenador** → ver la clase y los alumnos.

> El frontend manda las llamadas a `/api` y Vite las redirige al backend en `localhost:3000` (proxy en `frontend/vite.config.js`). Por eso el backend tiene que estar corriendo en el puerto 3000. El `frontend/.env` es opcional en desarrollo.

---

## Problemas frecuentes

| Síntoma | Causa / solución |
|---------|------------------|
| Backend: `[FATAL] Variables de entorno faltantes` | Falta `backend/.env` o alguna de las 3 variables del Paso 3. El archivo se tiene que llamar exactamente `.env` (no `.env.txt`). |
| Backend: aviso `[ADVERTENCIA] NODE_TLS_REJECT_UNAUTHORIZED=0` | Normal en desarrollo, no es un error. |
| http://localhost:3000/api/sedes da `Error al obtener sedes` | `SUPABASE_URL` o `SUPABASE_SERVICE_KEY` mal copiadas, o se usó la clave `anon` en vez de `service_role`. |
| La lista de sedes sale vacía / “Correo o contraseña incorrectos” | No se corrió `database/datos-iniciales.sql` (Paso 2.4). |
| Al correr `datos-iniciales.sql`: `duplicate key value` | Ya se había corrido antes: los datos ya están cargados. |
| Frontend: `Network Error` o 500 en todas las pantallas | El backend no está corriendo, o está en otro puerto que no es 3000. |
| `npm` no se reconoce como comando | Instalar Node.js y **reiniciar VS Code**. |
| PowerShell: “la ejecución de scripts está deshabilitada” | Usar la terminal *Command Prompt* de VS Code (flecha al lado del “+”), o correr una vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`. |
| Puerto 3000 o 5173 ocupado | Cerrar la otra app que lo usa. Si se cambia `PORT` del backend, cambiar también el `target` del proxy en `frontend/vite.config.js`. |

---

## Variables de entorno

### `backend/.env`

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `SUPABASE_URL` | ✅ | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | ✅ | Clave `service_role` / secret (solo backend, nunca en el frontend) |
| `JWT_SECRET` | ✅ | String largo y aleatorio para firmar las sesiones |
| `PORT` | — | Puerto del backend (default `3000`) |
| `CORS_ORIGINS` | — | Orígenes permitidos separados por coma (default `http://localhost:5173`) |
| `FRONTEND_URL` | — | URL del frontend, para los links de los emails |
| `BREVO_API_KEY` | — | API key de Brevo. Sin ella, los emails se muestran en consola |
| `BREVO_FROM_EMAIL` / `BREVO_FROM_NAME` | — | Remitente verificado en Brevo |
| `NODE_ENV` | — | Solo en el servidor de producción: `production` |

### `frontend/.env` (opcional en desarrollo)

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | `/api` en desarrollo (default). En producción, la URL completa del backend, ej. `https://snop-backend.up.railway.app/api` |

---

## Base de datos

PostgreSQL en **Supabase**. Explicada tabla por tabla en [`docs/esquema.md`](docs/esquema.md).

| Archivo | Contenido |
|---------|-----------|
| [`database/esquema.sql`](database/esquema.sql) | Estructura completa: 24 tablas, claves, índices, funciones y políticas RLS. Sin datos. |
| [`database/datos-iniciales.sql`](database/datos-iniciales.sql) | Catálogos (roles, categorías, club, sedes, mesas, tipos de turno, configuración), 4 usuarios de prueba, un bono, un juego libre, un torneo y un comunicado. Las fechas son relativas al día en que se corre, así que las actividades siempre quedan a futuro. |

El backend se conecta con la clave `service_role`, por eso las políticas RLS no lo limitan. Las contraseñas se guardan con **bcrypt** en `users.password`.

**Exportar una base existente** (esquema + datos) sin necesitar `pg_dump` ni Docker:

```bash
cd backend
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-1-us-east-2.pooler.supabase.com:5432/postgres" npm run exportar-bd -- snop.sql
# agregar --sin-datos para exportar solo la estructura
```

La `DATABASE_URL` sale de Supabase → **Connect → Direct → Session pooler**. El `.sql` generado se importa igual que en el Paso 2.

---

## Calidad: lint, tests y build

```bash
cd backend  && npm run check    # eslint + tests (vitest)
cd frontend && npm run check    # eslint + lint:css + tests + build
```

Los tests no necesitan base de datos. CI: `.github/workflows/ci.yml` corre `npm run check` en las dos carpetas en cada push a `main` y en cada PR.

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

Las 24 hs y los 7 días de “última semana” se leen de la tabla `configuracion_club`.

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
