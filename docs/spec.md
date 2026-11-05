# SNOP — Spec
> Última actualización: 2026-11-05 (sprint 3). Contexto completo en `docs/CONTEXT.md`.

---

## ✅ Completado

| ID | Descripción |
|----|-------------|
| A1–A11 | Bugs críticos del sprint 1–2 (errores, `socioTurnoService`, fechas ART, historial, categorías por ID, comunicados multi-segmento, `SearchInput`, baja lógica) |
| C1 | Contrato `{ ok, data }` / `{ ok:false, mensaje }` en todos los routers (`adminTurnos` incluido) + `ErrorNegocio` |
| C2 | Fechas: helpers de `fecha.js` en todo el backend; horas en 24 hs en toda la app |
| C3 | Migraciones 001–005 aplicadas y verificadas; historial en `docs/esquema.md` |
| C4 | Créditos: usado ≠ vencido; arrastre de fin de mes corregido; crédito por cancelación del club |
| C5 | Seguridad: env obligatorias, `requireRole` en todas las rutas (socio, entrenador, admin), sin endpoints públicos innecesarios |
| C6 | ESLint en 0 |
| C7 | 75 tests (créditos, fechas, lista de espera, errores, `socioTurnoService`, categorías, sintaxis del backend) |
| C8–C9 | `.gitignore`, README |
| C10 | CI en GitHub Actions (`npm run check`) |
| R5 | Regla 5: promoción automática de lista de espera |
| R9 | Cancelación del club → `baja_entrenador` + crédito + aviso |
| R10 | Categorías habilitadas en juego libre / torneos (backend + UI) |
| B1 | Tokens en `src/index.css` (+16 extendidos) |
| B2 | 0 hex sueltos en `.css` y `.jsx` (`npm run lint:css`) |
| B3 parcial | `Button`, `ConfirmDialog`, `EmptyState`, `ErrorState`, `Spinner`, `Skeleton`, `CategoriasHabilitadas` |
| B4 | `AppNav` único; navs viejos eliminados |
| B7 | `Spinner` / `EmptyState` / `ErrorState` en las pantallas |
| B8 parcial | `aria-label` en botones de solo ícono |
| B9 | `/design-system` con tokens extendidos y todos los componentes |
| P1 | Bundle inicial 870 → 285 kB (carga por pantalla) |

---

## ❌ Pendiente — en orden de prioridad

### 1. Revisión visual (B10) — manual
B2 cambió ~465 colores a tokens y algunos tonos se unificaron (ej. el azul `#2563eb` de varias páginas pasó a ser el primario `#1565C0`; los tres violetas, uno solo). Recorrer en **360 px y escritorio, claro y oscuro**: login, Inicio, Entrenamientos, Mis clases, Clases particulares, Juego libre, Torneos, Perfil, pantallas del entrenador, AdminTurnos, GestionBonos, DetalleSocio. Anotar lo que se vea mal y ajustar el token (no volver a hex).

### 2. Prueba de punta a punta con datos reales
Recorrer los flujos que cambiaron de lógica:
- Socio cancela un turno lleno con alguien en lista de espera → el primero queda inscripto y recibe aviso.
- Entrenador cancela una clase → los inscriptos reciben aviso y crédito.
- Admin restringe un torneo a 3ª–4ª → un socio de 6ª ve el botón deshabilitado y el backend lo rechaza.
- Clases particulares: retirar una pendiente; cancelar una confirmada (con y sin 24 hs).
- Socio cancela un torneo y se vuelve a anotar.

### 3. Agenda y semanas canceladas
`turno_excepciones` (admin cancela una semana de un turno recurrente) no se refleja en la agenda del socio ni en Mis clases.

### 4. Sistema de diseño (resto)
- **B5** — Hojas CSS por página → CSS Modules. Al terminar, volver a `cssCodeSplit: true` en `vite.config.js`.
- **B6** — `TurnoCard` único con variantes por rol.
- **B3 resto** — `Modal`, `Card`, `Badge`, `Input`, `Select`, `PageHeader`, `AppLayout`: crearlos al migrar la primera pantalla que los use, no antes.
- **B8 resto** — foco visible, objetivos de 44 px, foco atrapado en modales.

---

## Notas para el próximo agente

- `npm run check` = lint + lint:css + tests + build. Es lo que corre CI. Build verde no alcanza para el backend: levantarlo y probar `/api/sedes`.
- Patrón de carga en páginas (ESLint react-hooks v7):
  ```jsx
  const cargar = useCallback(async () => { /* setState aquí */ }, [deps])
  useEffect(() => {
    async function init() { await cargar() }
    init()
  }, [cargar])
  ```
- Estado inicial que sale de `localStorage`: inicializador de `useState` (ver `AuthContext`), no un effect.
- Servicios del backend: errores para el usuario con `throw new ErrorNegocio('texto', status)`; en la ruta `responderError(res, err, 'genérico')`.
- Colores: solo `var(--color-...)`. Si falta un tono, agregar el token en `src/index.css` (claro **y** oscuro).
- Estados de pantalla: `<Spinner center />`, `<EmptyState />`, `<ErrorState onRetry />`. Confirmaciones destructivas: `<ConfirmDialog />`.
- NUNCA inventar columnas: ver `docs/esquema.md`. `socio_turno` no tiene `created_at` (usar `fecha_inscripcion`).
- Cambios de esquema: SQL idempotente → mostrárselo al usuario → él lo aplica en Supabase → actualizar `docs/esquema.md`.
