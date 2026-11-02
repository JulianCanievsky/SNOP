# SNOP — Spec actualizado
> Última actualización: 2026-11-02 (sprint 2). Ver `docs/CONTEXT.md` para el contexto completo.

---

## ✅ Completado

| ID | Descripción |
|----|-------------|
| A1 | `errores.js` + `obtenerMensajeError`, interceptor 401 login corregido, ~40 catch actualizados |
| A2 | `useJuegoLibre.js` lee `data.data`, `Inicio.jsx` corregido |
| A3 | `socioTurnoService.js` centraliza inserts/updates de `socio_turno` |
| A4 | `clasesParticulares.js` usa `socioTurnoService`, validaciones completas |
| A5 | `getTurnosBySocio` separa próximos/historial por fecha ART |
| A6 | CSS de `DetalleTorneo` agregado a `Torneos.css` |
| A7 | Tab Historial conectado a `GET /api/perfil/historial` (paginado, filtros mes/tipo). Hook `useHistorialPerfil.js` |
| A8 | `CrearTorneo.jsx` y `CrearJuegoLibre.jsx` usan 8 categorías desde API con `CategoriaBadge` e IDs |
| A9 | `EnviarComunicado.jsx` checkboxes múltiples, backend deduplica, migración 004 preparada |
| A10 | `SearchInput` creado, `GestionNiveles` y `GestionSocios` lo usan |
| A11 | `DELETE /api/admin/socios/:id` baja lógica, confirma por nombre, libera cupos, bloquea login |
| C1 | Todas las respuestas `{ error }` normalizadas en todos los routers |
| C2 parcial | `fecha.js` tiene `toFechaAR()` y `formatArES()`. Reemplazados en múltiples archivos |
| C3 | `migrations/README.md` + `docs/esquema.md` actualizado |
| C4 | Créditos: separación semántica `vencido ≠ usado`. Lógica movida a `rutas/creditos.js`. Sin `update({ usado: true })` al vencer |
| C5 | JWT_SECRET/SUPABASE_URL/SUPABASE_SERVICE_KEY obligatorias al arrancar. `requireRole(2,3)` en `entrenador.js`. `requireRole(3)` canónico en `adminTurnos.js` |
| C6 | ESLint: patrón `_ref.current = fn` eliminado de todos los archivos. Imports `useRef` huérfanos removidos. Build ✓ |
| C8 | `.gitignore` actualizado, archivos basura removidos del tracking |
| C9 | `README.md` completo |
| B1 | `src/index.css` tiene todos los tokens CSS (verificado) |
| B3 parcial | Componentes `Button`, `ConfirmDialog`, `EmptyState`, `ErrorState`, `Spinner`, `Skeleton` creados en `src/components/ui/` |
| B3 window.confirm | Todos los `window.confirm` reemplazados por `ConfirmDialog`: `MisClasesEntrenador.jsx`, `CrearJuegoLibre.jsx`, `CrearTorneo.jsx` |
| B4 parcial | `AppNav.jsx` — BottomNav unificado por rol. Los 3 originales siguen disponibles (migración pendiente) |

---

## ❌ Pendiente — en orden de prioridad

### 1. Aplicar migraciones pendientes en Supabase

Aplicar en este orden desde el SQL Editor de Supabase:
1. `migrations/002_juego_libre_niveles_habilitados.sql`
2. `migrations/003_users_eliminado_en.sql`
3. `migrations/004_comunicados_destinatarios_array.sql`

Sin estas migraciones, A8, A9 y A11 no funcionan en producción.

---

### 2. C7 — Tests mínimos (vitest)

Crear `tests/` con:
- Contrato `GET /api/juego-libre` → `{ ok: true, data: [] }`
- `crearInscripcion` con estado inválido → lanza error
- `obtenerMensajeError` — prioriza `data.mensaje`, luego `data.error`, luego HTTP code
- Crédito con exactamente 24hs → genera; 23:59 → no genera
- Arrastre fin de mes: clase en última semana → crédito mes siguiente
- Lista de espera FIFO
- Filtro turnos pasados en UTC-3
- Eliminación de socio

---

### 3. Bloque B — Sistema de diseño (pendiente)

**B2** — Eliminar hex sueltos. Peores archivos: `MisClases.css`, `ClasesParticulares.css`, `PerfilPublicoEntrenador.css`, `RatingEntrenador.css`, `Admin.css`. Agregar `npm run lint:css`.

**B3 (resto)** — Componentes base pendientes:
`Modal`, `Card`, `Badge`, `Input`, `Select`, `DatePicker`,
`Avatar`, `AvatarGroup`, `ProgressBar`, `DayPicker`, `PageHeader`, `AppLayout`.

**B4 (completar)** — Migrar todos los usos de `BottomNav`/`AdminBottomNav`/`BottomNavEntrenador` a `AppNav`. Una vez migrado, eliminar los 3 originales.

**B5** — 27 hojas CSS globales → CSS Modules.

**B6** — `TurnoCard` único con variantes por rol.

**B7** — Usar `Spinner`, `EmptyState`, `ErrorState` en todas las pantallas de forma sistemática.

**B8** — Accesibilidad: foco visible, 44px mínimo, labels, aria-label en botones ícono, foco atrapado en modales + Esc.

**B9** — `/design-system` con todos los componentes, variantes, 8 categorías, ambos temas.

**B10** — Revisar en 360px y escritorio: login, Entrenamientos + modal, DetalleTorneo, GestionNiveles, EnviarComunicado.

---

## Orden de ejecución recomendado

```
1. Aplicar migraciones 002+003+004 en Supabase (acción manual del usuario)
2. C7  — tests vitest
3. B2  — eliminar hex sueltos + lint:css
4. B3 (resto) — Modal, Card, Badge, Input, Select...
5. B4 completo — migrar todos los usos a AppNav
6. B5→B10 — resto del sistema de diseño
```

---

## Notas para el próximo agente

- El build de Vite **pasa** (verificado en sprint 2). No rompas eso.
- Patrón useEffect correcto (ya aplicado en todos los archivos):
  ```jsx
  const cargar = useCallback(async () => { /* setState aquí */ }, [deps])
  useEffect(() => {
    async function init() { await cargar() }
    init()
  }, [cargar])
  ```
- `ConfirmDialog` es un bottom sheet — úsalo para cualquier confirmación destructiva (reemplaza `window.confirm`).
- `AppNav` lee el rol desde `AuthContext` automáticamente — no requiere prop de rol.
- Los componentes `Spinner`, `EmptyState`, `ErrorState`, `Skeleton` están en `src/components/ui/` listos para usar.
- `rutas/creditos.js` ya maneja la semántica correcta de vencido vs usado.
- `requireRole` es el patrón canónico para proteger rutas — no crear helpers custom como `soloAdmin`.
