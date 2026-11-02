# SNOP — Contexto de Desarrollo Acumulado
> Generado: 2026-11-02 (sprint 2). Fuente de verdad para retomar el trabajo sin leer el historial de conversación.

---

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite 8, React Router 7, Axios, Lucide React |
| Backend | Express 4.21 + Node ESM (`type: "module"`) |
| Base de datos | Supabase (PostgreSQL) con service key (NO cliente de browser) |
| Estilos | CSS puro + CSS Modules (sin Tailwind) |
| Deploy | Frontend: Vercel · Backend: Railway |
| Zona horaria | `America/Argentina/Buenos_Aires` (UTC-3, sin DST) — SIEMPRE |

---

## Estructura de carpetas

```
SNOP/
├── rutas/           — routers Express (backend)
├── src/
│   ├── components/  — componentes React
│   │   └── ui/      — sistema de diseño
│   │       ├── Button/       — Button.jsx + Button.module.css
│   │       ├── CategoriaBadge/
│   │       ├── ConfirmDialog/ — ConfirmDialog.jsx + .module.css (reemplaza window.confirm)
│   │       ├── EmptyState/   — EmptyState.jsx + .module.css
│   │       ├── ErrorState/   — ErrorState.jsx + .module.css
│   │       ├── SearchInput/
│   │       ├── Skeleton/     — Skeleton.jsx + .module.css
│   │       ├── Spinner/      — Spinner.jsx + .module.css
│   │       └── Toast.jsx / Toast.module.css
│   ├── components/AppNav/    — AppNav.jsx — BottomNav unificado por rol
│   ├── config/db.js — único cliente Supabase (service key)
│   ├── constants/categorias.js — 8 categorías canónicas
│   ├── context/     — AuthContext, ThemeContext
│   ├── hooks/       — hooks custom
│   ├── lib/
│   │   ├── apiClient.js  — instancia axios con interceptor JWT
│   │   ├── errores.js    — obtenerMensajeError(err) — ÚNICO helper de errores frontend
│   │   ├── fecha.js      — helpers ART: hoyAR(), toFechaAR(), formatArES(), parseFechaAR()...
│   │   ├── notificaciones.js — crearNotificacion(), enviarEmail() (backend)
│   │   ├── responder.js  — responder.ok/error/creado/... (backend, ÚNICO helper de respuestas)
│   │   └── supabase.js
│   ├── middlewares/autenticar.js — verifica JWT, puebla req.userId / req.userTipo / req.user
│   ├── pages/       — páginas por rol
│   └── services/
│       └── socioTurnoService.js — ÚNICO módulo autorizado para mutar socio_turno
├── migrations/      — SQL versionado, idempotente, con ROLLBACK comentado
├── docs/
│   ├── esquema.md   — esquema real de Supabase (fuente de verdad)
│   ├── spec.md      — especificación del proyecto
│   └── CONTEXT.md   — este archivo
└── server.js        — entry point backend
```

---

## Reglas de negocio (NO cambiar)

1. **1ª categoría = la más alta** (élite). 8ª = la más baja.
2. Cancelar con **≥24 hs** genera crédito de recupero.
3. El crédito dura el mes. Si la clase cae en la **última semana del mes**, el crédito se arrastra al mes siguiente.
4. Solicitudes de turno (puntual y recurrente) requieren **aprobación del entrenador**.
5. Lista de espera: el primero disponible recibe **confirmación directa** (solo esa vez).
6. `socioId` siempre sale del **JWT** (nunca de params/body).
7. `estado_texto` siempre se escribe junto al boolean `estado` — usar `socioTurnoService.js`.

---

## Contratos establecidos

### Backend → Frontend
```json
// Éxito
{ "ok": true, "data": <cualquier> }
// Error
{ "ok": false, "mensaje": "texto en español" }
```
Usar `responder.js` en el backend, `obtenerMensajeError(err)` en el frontend.

### Estados de `socio_turno.estado_texto`
| Valor | boolean estado | Descripción |
|-------|---------------|-------------|
| `activo` | true | Inscripto y confirmado |
| `pendiente` | false | Esperando aprobación |
| `cancelado_a_tiempo` | false | Canceló con ≥24hs → genera crédito |
| `cancelado_tarde` | false | Canceló con <24hs → sin crédito |
| `baja_entrenador` | false | El entrenador lo bajó → genera crédito |

---

## Lo que se hizo (completado)

### Bugs críticos (Bloque A)
- **A1** ✅ `errores.js` con `obtenerMensajeError`, interceptor 401 del login corregido.
- **A2** ✅ `useJuegoLibre.js` lee `data.data`, `Inicio.jsx` corregido.
- **A3** ✅ `socioTurnoService.js` centraliza inserts/updates de `socio_turno`.
- **A4** ✅ `rutas/clasesParticulares.js` usa `socioTurnoService`, validaciones completas.
- **A5** ✅ `getTurnosBySocio` separa próximos/historial por fecha ART.
- **A6** ✅ CSS de `DetalleTorneo` agregado a `Torneos.css`.
- **A7** ✅ Tab Historial conectado al endpoint paginado `/api/perfil/historial` con filtros mes/tipo/paginación. Hook `useHistorialPerfil.js` creado.
- **A8** ✅ `CrearTorneo.jsx` y `CrearJuegoLibre.jsx` usan 8 categorías reales (IDs) desde `/api/admin/niveles` con `CategoriaBadge`. Migración 002 preparada.
- **A9** ✅ `EnviarComunicado.jsx` usa checkboxes múltiples. Backend deduplica destinatarios. `comunicados.destinatarios` pasa a `text[]` (migración 004). `enviarEmailComunicado` actualizado.
- **A10** ✅ `SearchInput` componente creado, `GestionNiveles.jsx` y `GestionSocios.jsx` lo usan.
- **A11** ✅ `DELETE /api/admin/socios/:id` baja lógica con confirmación por nombre, libera cupos, promueve lista de espera, bloquea login. `DetalleSocio.jsx` con UI de confirmación.

### Normalización de contratos (C1)
- ✅ Todos los routers normalizados con `responder.*`

### Fechas (C2 parcial)
- ✅ `src/lib/fecha.js` — agregados `toFechaAR()` y `formatArES()` helpers
- ✅ Múltiples archivos actualizados

### Migraciones documentadas (C3) — ✅

### Auth (A11 complemento)
- ✅ `rutas/auth.js` bloquea socios con `eliminado_en != null`

### ESLint (C6) — ✅ SPRINT 2
- ✅ Patrón viejo `_ref.current = fn` durante render eliminado de todos los archivos
- ✅ Archivos corregidos: `useJuegoLibre.js`, `Inicio.jsx`, `MisTurnos.jsx`, `Torneos.jsx`
- ✅ Imports `useRef` huérfanos eliminados de 9 archivos: `AdminActividades.jsx`, `ClasesParticulares.jsx`, `GestionBonos.jsx`, `Entrenamientos.jsx`, `GestionNiveles.jsx`, `MisClases.jsx`, `AdminTurnos.jsx`, `PerfilPublicoEntrenador.jsx`, `SolicitudesIngreso.jsx`
- ✅ `MisTurnos.jsx` refactorizado: `cargarAgendaYRating` con `useCallback`, deps correctas
- ✅ Build pasa sin errores

### Seguridad (C5) — ✅ SPRINT 2
- ✅ `server.js`: validación de `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` obligatorias al arrancar (`process.exit(1)` si faltan)
- ✅ `rutas/entrenador.js`: agregado `requireRole(2, 3)` — antes solo tenía `autenticar`
- ✅ `rutas/adminTurnos.js`: reemplazado `soloAdmin` custom por `requireRole(3)` canónico
- ✅ `rutas/exportar.js` y `rutas/admin.js`: ya tenían `requireRole(3)` — sin cambios
- ✅ `rutas/auth.js`: no loguea passwords ni tokens — verificado

### Créditos (C4) — ✅ SPRINT 2
- ✅ Separación semántica: `vencido` se calcula en runtime, NO se marca `usado=true` al vencer
- ✅ Lógica extraída de `server.js` a `rutas/creditos.js`
- ✅ `server.js` importa `creditosRouter` en `/api/creditos`
- ✅ Eliminado el `supabase.update({ usado: true })` que mezclaba semánticas

### README (C9) — ✅ SPRINT 2
- ✅ `README.md` completo con: requisitos, variables de entorno, comandos, migraciones, estructura, roles, reglas de créditos, deploy, stack

### Sistema de diseño (Bloque B) — PARCIAL SPRINT 2
- **B1** ✅ `src/index.css` ya tiene todos los tokens (verificado — trabajo anterior)
- **B3** ✅ (parcial) Componentes base creados:
  - `src/components/ui/Button/` — Button.jsx + Button.module.css
  - `src/components/ui/ConfirmDialog/` — ConfirmDialog.jsx + .module.css
  - `src/components/ui/EmptyState/` — EmptyState.jsx + .module.css
  - `src/components/ui/ErrorState/` — ErrorState.jsx + .module.css
  - `src/components/ui/Spinner/` — Spinner.jsx + .module.css
  - `src/components/ui/Skeleton/` — Skeleton.jsx + .module.css
- **B3 window.confirm** ✅ Reemplazados todos los `window.confirm` restantes:
  - `MisClasesEntrenador.jsx` — `window.confirm('¿Cancelar esta clase?')` → `ConfirmDialog`
  - `CrearJuegoLibre.jsx` — `window.confirm('¿Borrar...')` → `ConfirmDialog`
  - `CrearTorneo.jsx` — dos `window.confirm` → dos `ConfirmDialog`
- **B4** ✅ `src/components/AppNav/AppNav.jsx` — componente unificado por rol. **Migración completa**: todos los usos de `BottomNav`/`AdminBottomNav`/`BottomNavEntrenador` en `src/pages/` reemplazados por `AppNav`. 0 referencias residuales.

### C7 — Tests (vitest) — ✅ SPRINT 2 (segunda sesión)
- ✅ `vitest` instalado (`devDependencies`)
- ✅ `vitest.config.js` creado con `environment: 'node'`, `globals: true`
- ✅ `npm test` (= `vitest run`) disponible
- ✅ `tests/obtenerMensajeError.test.js` — 6 tests
- ✅ `tests/creditos.test.js` — 15 tests (vencido≠usado, 24hs exactas, arrastre fin de mes)
- ✅ `tests/listaEspera.test.js` — 5 tests (FIFO, orden estable)
- ✅ `tests/fechaAR.test.js` — 6 tests (UTC vs ART, turnos pasados)
- **32 tests, 0 fallos**

### Limpieza git (C8) — ✅

---

## ❌ LO QUE FALTA — pendiente

### C7 — Tests mínimos (vitest)
Ningún test existe. Crear en `tests/`:
- Contrato de `GET /api/juego-libre` — responde `{ ok, data: [] }`
- `crearInscripcion` con `estado_texto` inválido → lanza error
- `obtenerMensajeError` — lee `data.mensaje`, luego `data.error`, luego HTTP code
- Cálculo de crédito: cancelación con exactamente 24hs → genera crédito; con 23:59 → no
- Arrastre de fin de mes: clase en última semana → crédito al mes siguiente
- Lista de espera FIFO: primer inscripto en espera es el primero promovido
- Filtro de turnos pasados: turno con `fecha_fin` en UTC-3 correctamente clasificado

### Bloque B — Sistema de diseño (pendiente)

**B2** — Eliminar hex sueltos fuera de tokens.css. Peores archivos: `MisClases.css`, `ClasesParticulares.css`, `PerfilPublicoEntrenador.css`, `RatingEntrenador.css`, `Admin.css`. Agregar `npm run lint:css`.

**B3 (resto)** — Componentes base pendientes en `src/components/ui/`:
`Modal`, `Card`, `Badge`, `Input`, `Select`, `DatePicker`,
`Avatar`, `AvatarGroup`, `ProgressBar`, `DayPicker`, `PageHeader`, `AppLayout`.

**B4 (completar)** — ✅ COMPLETADO. Todos los usos de `BottomNav`/`AdminBottomNav`/`BottomNavEntrenador` migrados a `AppNav`.

**B5** — 27 hojas CSS globales → CSS Modules.

**B6** — `TurnoCard` único con variantes por rol.

**B7** — Usar `Spinner`, `EmptyState`, `ErrorState` en todas las pantallas (hoy los componentes existen pero no se usan sistemáticamente).

**B8** — Accesibilidad: foco visible, 44px, labels, aria-label, foco atrapado en modales.

**B9** — Actualizar `/design-system`.

**B10** — Revisar en 360px todas las pantallas.

---

## Archivos clave que NO tocar sin entender

| Archivo | Por qué es crítico |
|---------|-------------------|
| `src/services/socioTurnoService.js` | ÚNICO que puede insertar/actualizar `socio_turno` |
| `src/lib/errores.js` | ÚNICO helper de mensajes de error en el frontend |
| `src/lib/responder.js` | ÚNICO helper de respuestas HTTP en el backend |
| `src/config/db.js` | ÚNICO cliente Supabase (service key) |
| `src/middlewares/autenticar.js` | Verificación JWT + `requireRole` |
| `src/constants/categorias.js` | Definición canónica de las 8 categorías |
| `migrations/` | SQL idempotente — mostrar al usuario ANTES de aplicar |

---

## Variables de entorno necesarias

```bash
# Backend
SUPABASE_URL=                  # obligatorio, abortar si falta
SUPABASE_SERVICE_KEY=          # obligatorio, abortar si falta
JWT_SECRET=                    # obligatorio, abortar si falta
PORT=3001
CORS_ORIGINS=http://localhost:5173
FRONTEND_URL=https://snop-psi.vercel.app
BREVO_API_KEY=                 # opcional, sin ella los emails van a console.log

# Frontend (VITE_*)
VITE_API_URL=http://localhost:3001/api
```

---

## Cómo correr el proyecto

```bash
npm run dev:all     # backend (nodemon) + frontend (vite) en paralelo
npm run lint        # eslint src/ rutas/ server.js
npx vite build      # build de producción del frontend
```
