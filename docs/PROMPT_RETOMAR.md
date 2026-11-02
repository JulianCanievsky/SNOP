# Prompt para retomar el trabajo en SNOP

Copiá y pegá esto como primer mensaje en la próxima sesión:

---

```
Leé docs/CONTEXT.md y docs/spec.md del proyecto SNOP antes de hacer cualquier cosa.

Resumen rápido del contexto:
- React 19 + Vite (frontend) / Express + Supabase service key (backend)
- UI en español (Argentina), fechas en America/Argentina/Buenos_Aires
- Contrato de respuesta: { ok, data } / { ok:false, mensaje } — responder.js en backend, obtenerMensajeError en frontend
- NUNCA insertar en socio_turno fuera de src/services/socioTurnoService.js
- NUNCA inventar columnas — ver docs/esquema.md antes de tocar la BD

Lo que se hizo: A1-A11, C1, C2 parcial, C3, C8. Build pasa. Ver docs/CONTEXT.md sección "Completado".

Lo que falta (en orden):
1. C6 — ESLint: 22 errores por patrón `_ref.current = fn` durante render. Solución identificada en docs/spec.md sección C6. Aplicar en los 17 archivos listados, verificar con `npx eslint src/ rutas/ server.js` → 0 errores.
3. C5 — JWT_SECRET obligatorio + audit requireRole.
4. C4 — créditos vencido vs usado.
5. C9 — README.
6. C7 — tests vitest.
7. Bloque B — sistema de diseño (B1 tokens.css primero, luego B3 componentes, B4 BottomNav).

Empezá por C6. Antes de cerrar cada tarea: `npx eslint src/ rutas/ server.js` y `npx vite build` sin errores.
```

---

## Notas para el agente

- El build de Vite **ya pasa** (verificado). No rompas eso.
- El linter tiene DOS reglas relevantes: `react-hooks/set-state-in-effect` y `react-hooks/refs`. La solución correcta para ambas es la función `init()` local dentro del `useEffect`..
- `docs/CONTEXT.md` tiene la tabla completa de archivos críticos que no tocar sin entender.
- `server.js` tiene los endpoints inline de `/api/creditos` y `/api/comunicados` que eventualmente se mueven a sus routers propios (C4 y C9 respectivamente).
