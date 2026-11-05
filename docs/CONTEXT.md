# SNOP — Contexto de Desarrollo Acumulado
> Actualizado: 2026-11-05 (sprint 3). Fuente de verdad para retomar el trabajo sin leer el historial de conversación.
> Ver también: `docs/spec.md` (qué falta, en orden) y `docs/esquema.md` (base de datos).

---

## Qué es

App web de un club de tenis de mesa (2 sedes: Belgrano y Palermo). Tres roles:

| `tipo_usuario_id` | Rol | Qué hace |
|---|---|---|
| 1 | Socio | Se anota a entrenamientos, clases particulares, juego libre y torneos; cancela; lista de espera; ve créditos, bono, historial y comunicados; califica entrenadores |
| 2 | Entrenador | Ve sus clases y alumnos, publica horarios, aprueba/rechaza solicitudes, cancela clases, cambia la categoría de alumnos |
| 3 | Admin | ABM de socios (con baja lógica), turnos (fijos y puntuales), juego libre, torneos, bonos, comunicados, solicitudes de ingreso, exportación a Excel |

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite 8, React Router 7, Axios, Lucide React. Pantallas con `React.lazy` |
| Backend | Express 4.21 + Node ESM (`type: "module"`), Node `^20.19 \|\| >=22.12` |
| Base de datos | Supabase (PostgreSQL) con **service key solo en el backend** (no hay cliente Supabase en el navegador) |
| Estilos | Tokens en `src/index.css` + CSS global por página + CSS Modules en `components/ui`. **Cero hex sueltos** (`npm run lint:css`) |
| Tests | Vitest 5 (`tests/`, 75 tests) |
| CI | GitHub Actions → `npm run check` |
| Emails | Brevo (sin `BREVO_API_KEY` se loguean en consola) |
| Deploy | Frontend: Vercel (`snop-psi.vercel.app`) · Backend: Railway |
| Zona horaria | `America/Argentina/Buenos_Aires` (UTC-3, sin DST) — SIEMPRE. Horas en 24 hs (`hourCycle: 'h23'`) |

---

## Estructura

```
SNOP/
├── server.js                 — entry point: CORS, rate limit, monta routers; inline /api/sedes,
│                               /api/niveles, /api/comunicados(/todos)
├── rutas/                    — un router Express por dominio (ver "Mapa de la API")
├── src/
│   ├── App.jsx               — rutas + RutaProtegida por rol + Suspense (carga por pantalla)
│   ├── components/
│   │   ├── AppNav/           — barra inferior única para los 3 roles
│   │   ├── CreditosResumen/, RatingEntrenador/, TurnoCard/
│   │   └── ui/               — Button, CategoriaBadge, CategoriasHabilitadas, ConfirmDialog,
│   │                           EmptyState, ErrorState, SearchInput, Skeleton, Spinner, Toast
│   ├── config/db.js          — ÚNICO cliente Supabase (service key, backend)
│   ├── constants/categorias.js — 8 categorías + nivelHabilitado() (compartido front/back)
│   ├── context/              — AuthContext (sesión en localStorage), ThemeContext (claro/oscuro)
│   ├── controllers/turnosController.js — handlers de /api/turnos
│   ├── hooks/                — useEntrenador, usePerfil, useHistorialPerfil, useRating, useToast...
│   ├── lib/
│   │   ├── apiClient.js      — axios con JWT + interceptor 401 (frontend)
│   │   ├── errores.js        — obtenerMensajeError(err) (frontend)
│   │   ├── errorNegocio.js   — ErrorNegocio + responderError (backend)
│   │   ├── fecha.js          — helpers ART (front y back): hoyAR, toFechaAR, parseFechaAR, formatArES...
│   │   ├── notificaciones.js — crearNotificacion, enviarEmail, plantillas de email (backend)
│   │   └── responder.js      — responder.ok/creado/error/... (backend)
│   ├── middlewares/autenticar.js — JWT → req.user / req.userId + requireRole(...)
│   ├── pages/                — socio (raíz), entrenador/, Admin/, DesignSystem/ (solo dev)
│   └── services/
│       ├── *Api.js           — llamadas HTTP del FRONTEND
│       ├── turnosService.js  — lógica del BACKEND: cancelar, créditos, lista de espera, bajas del club
│       └── socioTurnoService.js — ÚNICO módulo que escribe (insert/update/delete) en socio_turno
├── scripts/lint-css.mjs      — detecta hex sueltos en .css y .jsx
├── tests/                    — vitest
├── .github/workflows/ci.yml  — CI
└── docs/
```

---

## Reglas de negocio (NO cambiar)

1. **1ª categoría = la más alta** (élite). 8ª = la más baja.
2. Cancelar con **≥ 24 hs** genera crédito de recupero (`cancelado_a_tiempo`); con menos, no (`cancelado_tarde`).
3. El crédito dura el mes. Si la clase cae en la **última semana del mes** (últimos 7 días), se arrastra: vence a fin del mes siguiente y su `mes_periodo` es ese mes.
4. Solicitudes de turno (puntual y recurrente) requieren **aprobación del entrenador**.
5. Lista de espera: cuando se libera un cupo, el primero (FIFO por `created_at`) queda **inscripto directamente** (`turnosService.promoverListaEspera`). Se llama al cancelar el socio, al quitar el admin y en la baja de un socio.
6. `socioId` siempre sale del **JWT** (`req.userId`), nunca de params/body.
7. `socio_turno` se escribe SOLO vía `socioTurnoService.js` (insert, update y delete). `estado_texto` y `estado` siempre juntos.
8. Crédito **usado** ≠ **vencido**: `vencido` se calcula en runtime, nunca se marca `usado=true` al vencer.
9. Si **cancela el club** (entrenador cancela la clase o admin suspende el turno): cada inscripto → `baja_entrenador` + crédito **sin importar la anticipación** (`turnosService.darDeBajaInscriptosPorClub`) + aviso.
10. Juego libre y torneos: `niveles_habilitados` vacío = todos; si no, solo esas categorías (`nivelHabilitado()`); el backend lo hace cumplir.

---

## Contratos

### Respuestas Backend → Frontend
```json
{ "ok": true,  "data": <cualquier> }
{ "ok": false, "mensaje": "texto en español" }
```
- Backend: `responder.js`. Errores de servicios: lanzar `ErrorNegocio(mensaje, status)` y en la ruta `responderError(res, err, 'mensaje genérico')` → los esperables salen con su status y texto; el resto como 500 genérico (sin filtrar detalles de Supabase).
- Frontend: `obtenerMensajeError(err)`.
- Listas con total: `{ ok, data: { inscriptos, total } }` en `/admin/juego-libre/:id/inscriptos`, `/admin/torneos/:id/inscriptos`, `/admin/turnos/:id/inscriptos`.
- Excepciones aceptadas: `GET /api/turnos` agrega `historial` y `cancelados` al lado de `data`; `GET /api/perfil/historial` agrega `meta`; algunas rutas del entrenador responden `{ ok: true, mensaje }`.

### Estados de `socio_turno.estado_texto`
| Valor | `estado` | Significado |
|-------|---------|-------------|
| `activo` | true | Inscripto y confirmado |
| `pendiente` | false | Esperando aprobación del entrenador |
| `cancelado_a_tiempo` | false | Canceló con ≥ 24 hs → genera crédito |
| `cancelado_tarde` | false | Canceló con < 24 hs, o baja lógica del socio → sin crédito |
| `baja_entrenador` | false | Canceló el club (entrenador/admin) → genera crédito |

**Borrar vs. cambiar estado:** cancelaciones y bajas cambian estado (queda historial). Se **borra** solo lo que "nunca existió": solicitud pendiente retirada por el socio o rechazada por el entrenador, quita manual del admin (devuelve el crédito del bono) o el turno entero eliminado.

### `lista_espera_turno.estado`
`esperando` → `promovido` (quedó inscripto) · `cancelado` (salió o se dio de baja). Si vuelve a anotarse se reutiliza la fila.

### Comunicados (`destinatarios text[]`)
`todos` · `con_deuda` (solo socios con `cuota_al_dia = false`) · `entrenadores` · `nivel_<id>`. El socio ve `todos` + `con_deuda` si debe + su `nivel_<id>`; el entrenador, `todos` + `entrenadores`.

---

## Mapa de la API (`/api/...`)

| Prefijo | Archivo | Rol | Endpoints |
|---|---|---|---|
| `auth` | `auth.js` | público (rate limit 20/15 min) | `GET clubes`, `POST login`, `registro`, `forgot-password`, `reset-password` |
| `sedes` | `server.js` | público | lista de sedes |
| `niveles` | `server.js` | autenticado | 8 categorías |
| `comunicados`, `comunicados/todos` | `server.js` | socio | segmentados (ver arriba) |
| `turnos` | `turnos.js` + `turnosController` | socio | `GET /`, `GET disponibles`, `POST solicitar`, `DELETE :id` (cancelar), `PATCH :id/reconfirmar`, `POST/DELETE :id/lista-espera`, `GET :id/cupo` |
| `agenda` | `agenda.js` | socio | próximos eventos (turnos, juego libre, torneos) |
| `juego-libre` | `JuegoLibre.js` | socio | `GET /` (con `habilitado`), `POST :id/inscribir`, `DELETE :id/cancelar` |
| `torneos` | `torneos.js` | socio | `GET /` (con `habilitado`), `POST :id/inscribir`, `DELETE :id/cancelar` |
| `clases-particulares` | `clasesParticulares.js` | autenticado; socio para solicitar/liberar/mis-solicitudes | `GET entrenadores(/:id)`, `POST solicitar`, `DELETE liberar/:id` (pendiente → retira; confirmada futura → cancela con reglas), `GET mis-solicitudes` |
| `perfil` | `perfil.js` | socio | `GET /`, `GET historial` |
| `creditos` | `creditos.js` | socio | `{ disponibles, usados, vencidos, creditos }` |
| `bonos` | `bonos.js` | `mio` socio; resto admin | `GET mio`, `GET socio/:id`, `POST /`, `DELETE :id` |
| `ratings` | `ratings.js` | `POST /`, `pendientes`: socio · `entrenador/:id`: autenticado | |
| `notificaciones` | `notificaciones.js` | autenticado | `GET /`, `GET no-leidas`, `PATCH leer-todas`, `PATCH :id/leer` |
| `entrenador` | `entrenador.js` | entrenador/admin | resumen-hoy, mis-clases, clases/:id/cancelar, mis-alumnos, alumnos/:id(/nivel), mis-horarios (GET/POST/DELETE), solicitudes (+confirmar/rechazar), sedes, niveles, perfil, comunicados |
| `admin/exportar` | `exportar.js` | admin | Excel de turnos, juego libre, torneos |
| `admin/turnos` | `adminTurnos.js` | admin | ver encabezado del archivo (CRUD, asignar/quitar, cancelar-semana, lista de espera...) |
| `admin` | `admin.js` | admin | stats, socios (CRUD + baja lógica), entrenadores, sedes, niveles, comunicados, config, juego-libre, torneos, solicitudes de ingreso |

> En `server.js`, `admin/exportar` y `admin/turnos` se montan ANTES de `admin`.

---

## Historial de trabajo

### Sprint 1–2 (hasta 2026-11-02)
A1–A11 (bugs críticos), C1–C9 (contratos, fechas, créditos, seguridad, ESLint, tests, README), B1 (tokens), B3 parcial (componentes base), B4 (`AppNav`).

### Sprint 3 (2026-11-05)
**Backend caído y migraciones**
- El backend no arrancaba desde el commit `6489c95`: `rutas/admin.js` tenía pegado un bloque de una versión vieja y `rutas/entrenador.js` un `: 'próximamente'` duplicado. Arreglado + `tests/backendSintaxis.test.js` (+ CI) para que no se repita.
- Las migraciones 002–004 que pedían los docs no existían. Se escribieron 002–005, el usuario las aplicó y se verificaron contra la base. La carpeta `migrations/` se borró a pedido; el registro de qué hizo cada una está en `docs/esquema.md` (las 002–005 no llegaron a commitearse).

**Reglas de negocio**
- Regla 5 implementada de verdad: `promoverListaEspera` (antes solo se notificaba).
- Cancelación del club: el entrenador cancelaba la clase sin avisar ni dar crédito; el admin suspendía igual. Ahora `darDeBajaInscriptosPorClub`.
- Categorías habilitadas en juego libre y torneos: el backend las hace cumplir, el socio las ve (`CategoriasHabilitadas`) y el botón se deshabilita.
- Comunicados `con_deuda` los veían todos los socios → solo los que deben.
- Créditos: el arrastre del 31/01 caía en marzo (sumaba 32 días) → fin del mes siguiente.

**Bugs**
- Login dependía de una columna de la migración 003 (todos los logins fallaban sin ella).
- Torneos/juego libre: quien cancelaba no podía volver a anotarse. Lista de espera: quien ya había estado no podía volver a entrar.
- `getTurnosDisponibles`: quien canceló aparecía como "pendiente"; `en_lista_espera` siempre `false`. Ahora hay "En espera · Salir".
- Clases particulares: "Liberar turno" borraba cualquier inscripción (incluso confirmadas o pasadas, salteando créditos). Ahora pendiente → retira; confirmada futura → cancela con reglas; con `ConfirmDialog`.
- `cancelar-semana` guardaba la fecha UTC (clases ≥ 21 hs quedaban en el día siguiente). Horas formateadas con la zona del servidor (en Railway, UTC). Horas en "10:00 a. m." → 24 hs en toda la app.
- Email "¡Tenés lugar! Ya estás confirmado" se mandaba a gente no inscripta → plantilla `emailLugarDisponible`.
- Admin: detalle de socio siempre con 0 turnos, panel de anotados roto, reasignar socio cancelado imposible, suspensión avisaba a cancelados, `GET /admin/juego-libre` no traía categorías.

**Seguridad y contratos**
- `requireRole(1)` en todas las rutas de socio; `clases-particulares/entrenadores` dejó de ser público; `soloAdmin` casero eliminado.
- `adminTurnos.js` normalizado a `{ ok, data }`. `ErrorNegocio` para no exponer errores internos.
- Todas las escrituras de `socio_turno` pasan por `socioTurnoService` (incluidos los borrados).

**Sistema de diseño y frontend**
- B2: 370 hex en CSS + 95 en estilos inline JSX → tokens. 16 tokens nuevos (acento violeta, textos de estado, `surface-muted`, `rating`, `whatsapp`...). `lint:css` revisa `.css` y `.jsx`.
- B4: navs viejos eliminados. B7: `Spinner` / `EmptyState` / `ErrorState` en ~25 pantallas. B8 parcial: `aria-label` en botones de solo ícono. B9: `/design-system` actualizado.
- Bundle inicial 870 kB → 285 kB (`React.lazy`, CSS en un archivo, `NODE_ENV` fuera del `.env`).
- Código muerto eliminado: `src/lib/supabase.js`, `useAsyncEffect.js`, `VITE_SUPABASE_*`, ramas para tablas inexistentes.

---

## Deuda técnica conocida

| Tema | Detalle |
|---|---|
| B5 | Hojas CSS globales por página → CSS Modules. Hasta entonces `cssCodeSplit: false` |
| B3 resto | `Modal`, `Card`, `Badge`, `Input`, `Select`, `PageHeader`... (no crear sin una pantalla que los use) |
| B6 | `TurnoCard` único con variantes por rol |
| B8 resto | Foco visible, 44 px mínimo, foco atrapado en modales |
| B10 | Revisión visual en 360 px y escritorio, claro y oscuro (sobre todo después de B2) |
| Turnos recurrentes | `turno_excepciones` (semana cancelada) no se refleja en la agenda del socio |
| `configuracion_club` | Sin confirmar si tiene `clave/valor`; se usan defaults |
| Dev TLS | `server.js` pone `NODE_TLS_REJECT_UNAUTHORIZED=0` si `NODE_ENV !== 'production'` (proxy de la red). En Railway: `NODE_ENV=production` |

---

## Archivos críticos — no tocar sin entender

| Archivo | Por qué |
|---------|---------|
| `src/services/socioTurnoService.js` | ÚNICO que escribe en `socio_turno` |
| `src/services/turnosService.js` | Cancelación, créditos, lista de espera, bajas del club |
| `src/lib/responder.js` · `src/lib/errorNegocio.js` | Contrato de respuestas del backend |
| `src/lib/errores.js` | ÚNICO helper de mensajes de error en el frontend |
| `src/lib/fecha.js` | Zona horaria AR (front y back) |
| `src/config/db.js` | ÚNICO cliente Supabase |
| `src/middlewares/autenticar.js` | JWT + `requireRole` (único patrón de autorización) |
| `src/constants/categorias.js` | 8 categorías + `nivelHabilitado` |
| `src/index.css` | Tokens: única fuente de colores |
| `rutas/creditos.js` | Semántica usado ≠ vencido |

---

## Variables de entorno

```bash
# Backend (obligatorias — server.js aborta si faltan)
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
# Backend (opcionales)
PORT=3000                       # el proxy de Vite apunta a :3000
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=https://snop-psi.vercel.app   # links en emails
BREVO_API_KEY=                  # sin ella los emails van a console.log
BREVO_FROM_EMAIL=
BREVO_FROM_NAME=
# NODE_ENV: NO en el .env local. En Railway: production

# Frontend
VITE_API_URL=                   # vacío en dev (usa /api + proxy); en Vercel la URL de Railway
```

---

## Comandos

```bash
npm run dev:all     # backend (nodemon, :3000) + frontend (vite, :5173)
npm run server      # solo backend
npm run dev         # solo frontend
npm test            # vitest
npm run lint        # eslint (0 problemas)
npm run lint:css    # hex sueltos (0)
npm run build       # build de producción
npm run check       # todo lo anterior junto (= CI)
```

**Antes de cerrar cualquier tarea:** `npm run check`. Si tocaste el backend, además levantarlo y pegarle a `/api/sedes`.
