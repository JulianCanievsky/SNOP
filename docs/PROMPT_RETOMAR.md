# Prompt para retomar el trabajo en SNOP

Copiá y pegá esto como primer mensaje en la próxima sesión:

---

```
Leé docs/CONTEXT.md y docs/spec.md del proyecto SNOP antes de hacer cualquier cosa.

Resumen rápido del contexto:
- React 19 + Vite 8 (frontend) / Express + Supabase service key (backend)
- UI en español (Argentina), fechas en America/Argentina/Buenos_Aires
- Contrato de respuesta: { ok, data } / { ok:false, mensaje } — responder.js en backend, obtenerMensajeError en frontend
- NUNCA insertar en socio_turno fuera de src/services/socioTurnoService.js
- NUNCA inventar columnas — ver docs/esquema.md antes de tocar la BD

Lo que se hizo (sprint 1 + sprint 2):
A1–A11, C1, C2 parcial, C3, C4, C5, C6, C7, C8, C9. B1, B3 (Button, ConfirmDialog, Spinner, Skeleton, EmptyState, ErrorState), B4 completo (AppNav + migración total).
Build pasa. 32 tests pasando. Ver docs/CONTEXT.md sección "Completado".

Lo que falta (en orden):
1. Aplicar migraciones 002+003+004 en Supabase (acción manual del usuario — ver migrations/)
2. B2 — eliminar hex sueltos en MisClases.css, ClasesParticulares.css, etc. + npm run lint:css
3. B3 (resto) — Modal, Card, Badge, Input, Select, PageHeader, AppLayout
4. B5→B10 — resto del sistema de diseño

Empezá por B2 (eliminar hex sueltos). Antes de cerrar cada tarea: npm test y npx vite build sin errores.
```

---

## Notas para el agente

- El build de Vite **ya pasa** (verificado). No rompas eso.
- ESLint: todos los `_ref.current = fn` durante render fueron eliminados. Patrón correcto:
  `const fn = useCallback(async () => { ... }, [deps])`
  `useEffect(() => { async function init() { await fn() }; init() }, [fn])`
- `ConfirmDialog` en `src/components/ui/ConfirmDialog/` reemplaza `window.confirm`.
- `AppNav` en `src/components/AppNav/AppNav.jsx` unifica los 3 BottomNav por rol.
- `rutas/creditos.js` es el endpoint de créditos (movido de server.js inline).
- `requireRole(n)` es el único patrón de autorización — no crear funciones custom.
- Las variables `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` son obligatorias — server.js aborta si faltan.
- `docs/CONTEXT.md` tiene la tabla completa de archivos críticos que no tocar sin entender.
- `server.js` ya NO tiene endpoints inline de créditos. Sí tiene `/api/sedes`, `/api/niveles`, `/api/comunicados`.
