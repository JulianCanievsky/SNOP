# Prompt para retomar el trabajo en SNOP

Copiá y pegá esto como primer mensaje en la próxima sesión:

---

```
Leé docs/CONTEXT.md y docs/spec.md del proyecto SNOP antes de hacer cualquier cosa.

Resumen rápido:
- React 19 + Vite 8 (frontend) / Express + Supabase service key (backend)
- UI en español (Argentina), fechas en America/Argentina/Buenos_Aires, horas en 24 hs
- Contrato: { ok, data } / { ok:false, mensaje } — responder.js + ErrorNegocio en backend,
  obtenerMensajeError en frontend
- socio_turno se escribe SOLO desde src/services/socioTurnoService.js
- requireRole(...) es el único patrón de autorización
- Colores solo con tokens var(--color-...) de src/index.css (npm run lint:css)
- NUNCA inventar columnas — ver docs/esquema.md

Estado al 2026-11-05 (sprint 3): migraciones aplicadas, backend funcionando,
75 tests, ESLint 0, lint:css 0, CI con npm run check.

Lo que falta (en orden, detalle en docs/spec.md):
1. Revisión visual B10 (claro/oscuro, 360px) tras la conversión de colores — preguntame qué vi.
2. Prueba de punta a punta de los flujos nuevos (lista de espera, cancelación del club,
   categorías en torneos/juego libre, clases particulares).
3. Mostrar en la agenda del socio las semanas canceladas (turno_excepciones).
4. B5 (CSS Modules), B6 (TurnoCard único), B8 resto.

Antes de cerrar cada tarea: npm run check. Si tocaste el backend, levantalo y probá GET /api/sedes.
```

---

## Notas para el agente

- `tests/backendSintaxis.test.js` corre `node --check` sobre todo el backend: el build del frontend NO detecta errores del backend.
- Lista de espera: `estado='esperando'`, FIFO por `created_at`; al liberarse un cupo usar `promoverListaEspera(turno)`.
- Cancelación del club: `darDeBajaInscriptosPorClub(turno)` (estado `baja_entrenador` + crédito).
- Categorías de eventos: `nivelHabilitado(niveles_habilitados, nivel_id)` en `src/constants/categorias.js`.
- `ConfirmDialog`, `Spinner`, `EmptyState`, `ErrorState` en `src/components/ui/`.
- Errores útiles de PostgREST: `42703` columna inexistente, `42P01` tabla inexistente, `23505` duplicado.
- `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` son obligatorias. No poner `NODE_ENV` en el `.env` local.
- En esta red, consultar Supabase con un script suelto se cuelga (proxy TLS). Para verificar la base, levantar el backend (`PORT=3999 node server.js`) y pegarle a sus endpoints.
