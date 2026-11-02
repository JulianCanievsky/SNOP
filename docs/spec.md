# SNOP — Spec actualizado
> Última actualización: 2026-11-02. Ver `docs/CONTEXT.md` para el contexto completo.

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
| C1 | Todas las respuestas `{ error }` normalizadas en admin.js, adminTurnos.js, ratings.js, bonos.js, exportar.js, clasesParticulares.js |
| C2 parcial | `fecha.js` tiene `toFechaAR()` y `formatArES()`. Reemplazados en `GestionBonos`, `ExportarActividades`, `rutas/entrenador.js` |
| C3 | `migrations/README.md` + `docs/esquema.md` actualizado |
| C8 | `.gitignore` actualizado, archivos basura removidos del tracking |

---

## ❌ Pendiente — en orden de prioridad

### 1. C6 — ESLint: 22 errores + 5 warnings (prioritario, bloquea CI)

**Causa raíz:** patrón `_ref.current = fn` durante el render viola `react-hooks/refs`.

**Solución ya identificada** — en cada archivo afectado, reemplazar:
```jsx
// ❌ Mal — actualiza ref durante render
const _ref = useRef(fn); _ref.current = fn
useEffect(() => { _ref.current() }, [])

// ✅ Bien — función local al effect
const cargar = useCallback(async () => { /* setState aquí */ }, [deps])
useEffect(() => {
  async function init() { await cargar() }
  init()
}, [cargar])
```

**Archivos a corregir** (15 archivos, todos el mismo patrón):
- `src/hooks/useEntrenador.js` — 7 instancias
- `src/hooks/useHistorialPerfil.js`
- `src/hooks/useClasesParticulares.js`
- `src/hooks/usePerfil.js`
- `src/hooks/useNotificaciones.js`
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

Verificar con `npx eslint src/ rutas/ server.js` → 0 errores, 0 warnings.

---

### 2. Aplicar migraciones pendientes en Supabase

Aplicar en este orden desde el SQL Editor de Supabase:
1. `migrations/002_juego_libre_niveles_habilitados.sql`
2. `migrations/003_users_eliminado_en.sql`
3. `migrations/004_comunicados_destinatarios_array.sql`

Sin estas migraciones, A8, A9 y A11 no funcionan en producción.

---

### 3. C4 — Créditos: vencido ≠ usado

- Migración: columna `vencido boolean DEFAULT false` en `creditos_clase`
- `GET /api/creditos` (inline en `server.js`): marcar `vencido=true` en vez de `usado=true`
- Mover lógica a `rutas/creditos.js`
- Tests: arrastre al mes siguiente, idempotencia

---

### 4. C5 — Auditoría de seguridad

- JWT_SECRET obligatorio al arrancar: si falta → `process.exit(1)` con mensaje claro
- No loguear tokens ni passwords: revisar `auth.js` y `admin.js`
- Verificar `requireRole` en todos los routers admin y entrenador
- `autenticar.js` debe exponer `req.user = { id, rol, club_id }`

---

### 5. C7 — Tests mínimos (vitest)

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

### 6. C9 — README real

`README.md` con: requisitos, variables de entorno, `npm run dev:all`, cómo aplicar migraciones, estructura de carpetas, roles, reglas de créditos.

---

### 7. Bloque B — Sistema de diseño (todo pendiente)

Ejecutar en este orden:

**B1** — `src/styles/tokens.css`: extraer TODAS las variables de `src/index.css`. `index.css` queda solo con reset y base.

**B2** — Eliminar hex sueltos. Peores archivos: `index.css` (102), `MisClases.css` (78), `ClasesParticulares.css` (52), `PerfilPublicoEntrenador.css` (38), `RatingEntrenador.css` (37), `Admin.css` (31). Agregar `npm run lint:css`.

**B3** — Componentes base faltantes en `src/components/ui/`:
`Button`, `IconButton`, `Card`, `Badge`, `Input`, `Select`, `DatePicker`, `Modal`,
`ConfirmDialog` (reemplazar `window.confirm` en: `CrearJuegoLibre.jsx:92`, `GestionBonos.jsx:251`, `CrearTorneo.jsx:95+117`, `MisHorariosEntrenador.jsx:114`, `MisClasesEntrenador.jsx:53`),
`Avatar`, `AvatarGroup`, `ProgressBar`, `DayPicker`, `EmptyState`, `ErrorState`, `Spinner`, `Skeleton`, `PageHeader`, `AppLayout`.

**B4** — Unificar `BottomNav` / `AdminBottomNav` / `BottomNavEntrenador` → un solo componente con items por rol.

**B5** — 27 hojas CSS globales → CSS Modules.

**B6** — `TurnoCard` único con variantes por rol.

**B7** — Estados obligatorios en cada pantalla: Skeleton, EmptyState, ErrorState, Toast.

**B8** — Accesibilidad: foco visible, 44px mínimo, labels, aria-label en botones ícono, foco atrapado en modales + Esc.

**B9** — `/design-system` con todos los componentes, variantes, 8 categorías, ambos temas.

**B10** — Revisar en 360px y escritorio: login (3 tabs), Entrenamientos + modal solicitar, DetalleTorneo, GestionNiveles, EnviarComunicado.

---

## Orden de ejecución recomendado

```
1. C6  — ESLint 0 errores (rápido, 15 archivos, mismo patrón)
2. Aplicar migraciones 002+003+004 en Supabase
3. C5  — JWT_SECRET obligatorio + requireRole audit
4. C4  — créditos vencido vs usado
5. C9  — README
6. C7  — tests vitest
7. B1  — tokens.css
8. B3  — componentes base (Button, Modal, ConfirmDialog primero)
9. B4  — BottomNav unificado
10. B2 — eliminar hex sueltos
11. B5→B10 — resto del sistema de diseño
```
