# SNOP — Contexto de Desarrollo Acumulado
> Generado: 2026-11-02. Fuente de verdad para retomar el trabajo sin leer el historial de conversación.

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
│   │   └── ui/      — componentes de sistema de diseño
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

--

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
- ✅ `rutas/admin.js` — 36 respuestas `{ error }` → `responder.*`
- ✅ `rutas/adminTurnos.js` — 47 respuestas normalizadas
- ✅ `rutas/ratings.js` — 10 respuestas normalizadas
- ✅ `rutas/bonos.js` — 8 respuestas normalizadas
- ✅ `rutas/exportar.js` — 4 respuestas normalizadas
- ✅ `rutas/clasesParticulares.js` — normalizado
- ✅ `rutas/torneos.js` — ya estaba normalizado
- ✅ `rutas/notificaciones.js` — ya estaba normalizado

### Fechas (C2 parcial)
- ✅ `src/lib/fecha.js` — agregados `toFechaAR()` y `formatArES()` helpers
- ✅ `GestionBonos.jsx` — reemplazados `toISOString().split('T')[0]` con `hoyAR()`
- ✅ `ExportarActividades.jsx` — reemplazado `toISOString().slice(0,10)`
- ✅ `rutas/entrenador.js` — reemplazados 10x `toLocaleString('en-CA',...).slice`; `toLocaleString('es-AR')` → `formatArES()`
- ✅ Filtro de comunicados en `server.js` y `rutas/entrenador.js` actualizado para `text[]`

### Migraciones documentadas (C3)
- ✅ `migrations/README.md` creado con instrucciones de aplicación
- ✅ `docs/esquema.md` actualizado con cambios pendientes

### Auth (A11 complemento)
- ✅ `rutas/auth.js` bloquea socios con `eliminado_en != null` con mensaje "No pertenecés a ningún club"

---

## ❌ LO QUE FALTA — pendiente con detalles de implementación

### C6 — ESLint: 22 errores + 5 warnings (PRIORITARIO)

**Problema:** El linter tiene DOS reglas en conflicto:
1. `react-hooks/set-state-in-effect`: prohíbe llamar funciones externas que llamen `setState` desde un `useEffect`
2. `react-hooks/refs`: prohíbe actualizar `.current` durante el render

**Archivos con errores** (patrón `_ref.current = fn` durante render):
- `src/hooks/useEntrenador.js` — usa helper `useInitEffect` (correcto pero ref se actualiza en render)
- `src/hooks/useHistorialPerfil.js`
- `src/hooks/useClasesParticulares.js`
- `src/pages/Admin/AdminActividades.jsx`
- `src/pages/Admin/AdminTurnos.jsx`
- `src/pages/Admin/GestionBonos.jsx`
- `src/pages/Admin/GestionNiveles.jsx`
- `src/pages/Admin/SolicitudesIngreso.jsx`
- `src/pages/Entrenamientos/Entrenamientos.jsx`
- `src/pages/Inicio/Inicio.jsx`
- `src/pages/JuegoLibre/useJuegoLibre.js`
- `src/pages/MisClases/MisClases.jsx`
- `src/pages/MisTurnos/MisTurnos.jsx`
- `src/pages/Torneos/Torneos.jsx`
- `src/pages/entrenador/PerfilPublicoEntrenador/PerfilPublicoEntrenador.jsx`

**Solución correcta identificada** — reemplazar el patrón en TODOS con:
```jsx
// En vez de:
const _ref = useRef(fn); _ref.current = fn  // ← error: update durante render
useEffect(() => { _ref.current() }, [])

// Usar:
const cargar = useCallback(async () => { /* lógica con setState */ }, [deps])
useEffect(() => {
  async function init() { await cargar() }  // ← función LOCAL al effect
  init()
}, [cargar])  // ← el linter no ve setState síncrono porque está en init()
```

También warnings:
- `src/pages/MisTurnos/MisTurnos.jsx` — `react-hooks/exhaustive-deps`: missing dep `cargarPendientes`
- `src/pages/entrenador/PerfilPublicoEntrenador/PerfilPublicoEntrenador.jsx` — unused eslint-disable

---

### C4 — Créditos: vencido ≠ usado

**Problema:** En `GET /api/creditos` (inline en `server.js`) los créditos vencidos se marcan `usado: true`, mezclando los dos conceptos y distorsionando el contador.

**Solución:**
1. Migración: agregar columna `vencido boolean DEFAULT false` a `creditos_clase`
2. Al calcular créditos, marcar `vencido = true` en vez de `usado = true` para los vencidos
3. Mover la lógica de `/api/creditos` fuera de `server.js` a `rutas/creditos.js`
4. Verificar arrastre al mes siguiente con tests

---

### C5 — Auditoría de seguridad

Revisar:
- Que ningún endpoint use `socioId` de params/body (solo JWT) → ya mayormente OK
- Rate limiting en auth → ✅ ya existe `limiterAuth` en server.js
- JWT_SECRET obligatorio al arrancar → agregar validación al inicio de server.js
- No loguear tokens ni passwords → revisar logs en auth.js y admin.js
- Verificar `requireRole` en todos los routers admin y entrenador
- `autenticar.js` exporta `requireRole(rol)` → verificar que todos los routers admin lo usen

---

### C7 — Tests mínimos (vitest)

Ningún test existe. Crear en `src/__tests__/` o `tests/`:
- Contrato de `GET /api/juego-libre` — responde `{ ok, data: [] }`
- `crearInscripcion` con `estado_texto` inválido → lanza error
- `obtenerMensajeError` — lee `data.mensaje`, luego `data.error`, luego HTTP code
- Cálculo de crédito: cancelación con exactamente 24hs → genera crédito; con 23:59 → no
- Arrastre de fin de mes: clase en última semana → crédito al mes siguiente
- Lista de espera FIFO: primer inscripto en espera es el primero promovido
- Filtro de turnos pasados: turno con `fecha_fin` en UTC-3 correctamente clasificado

---

### C8 — Limpieza git
Archivos basura ya removidos del tracking (`.gitignore` actualizado). Verificar:
```bash
git status  # no deben aparecer *.txt temporales ni "({data"
```

---

### C9 — README real

Falta crear `README.md` con:
- Requisitos: Node 20+, npm, cuenta Supabase
- Variables de entorno (ver `.env.example`)
- Comandos: `npm run dev:all`, `npm run build`, `npm run lint`
- Cómo aplicar migraciones (copiar al SQL Editor de Supabase)
- Estructura de carpetas
- Roles: socio (tipo 1), entrenador (tipo 2), admin (tipo 3)
- Reglas de negocio de créditos

---

### Bloque B — Sistema de diseño (todo pendiente)

**B1** — `src/styles/tokens.css`: mover TODAS las variables de `src/index.css` (paleta, espaciado, radios, sombras, z-index, categorías 1-8 + todos, temas claro/oscuro). `index.css` queda solo con reset.

**B2** — Eliminar hex sueltos fuera de tokens.css. Archivos peores: `index.css`, `MisClases.css`, `ClasesParticulares.css`, `PerfilPublicoEntrenador.css`, `RatingEntrenador.css`, `Admin.css`. Agregar `npm run lint:css`.

**B3** — Componentes base faltantes en `src/components/ui/`:
`Button`, `IconButton`, `Card`, `Badge`, `Input`, `Select`, `DatePicker`, `Modal`, `ConfirmDialog` (reemplazar `window.confirm` en `CrearJuegoLibre.jsx:92`, `GestionBonos.jsx:251`, `CrearTorneo.jsx:95/:117`, `MisHorariosEntrenador.jsx:114`, `MisClasesEntrenador.jsx:53`), `Avatar`, `AvatarGroup`, `ProgressBar`, `DayPicker`, `EmptyState`, `ErrorState`, `Spinner`, `Skeleton`, `Tabs`, `PageHeader`, `AppLayout`.

**B4** — Unificar navegación inferior: `BottomNav`, `AdminBottomNav`, `BottomNavEntrenador` → UN solo componente con items por rol.

**B5** — 27 hojas CSS globales → CSS Modules.

**B6** — `TurnoCard` único con variantes por rol.

**B7** — Estados obligatorios en cada pantalla: Skeleton, EmptyState, ErrorState, Toast.

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
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
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
