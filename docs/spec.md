# SNOP — Spec de desarrollo

> Estado: **BORRADOR — en revisión con el usuario antes de ejecutar tareas**
> Última actualización: 16/10/2026

---

## PASO 0 — Preguntas bloqueantes (necesito tu respuesta antes de continuar)

Las siguientes preguntas afectan migraciones irreversibles o decisiones de diseño fundamentales.

### Respuestas confirmadas (16/10/2026)

| # | Pregunta | Respuesta |
|---|----------|-----------|
| P1 | ¿1ª es la más alta? | ✅ SÍ. 1ª = élite. Eliminar las 5 filas actuales e insertar 8 nuevas: 1ª (orden 1) → 8ª (orden 8). |
| P2 | Migrar `configuracion_club` | ✅ APROBADO |
| P3 | Migrar `socio_turno.estado` a texto | ✅ APROBADO |
| P4 | Flujo de inscripción | ✅ CONFIRMADO: **ambas modalidades** (puntual y recurrente) requieren aprobación del admin/entrenador. Lista de espera → cupo liberado → el socio confirma **directo** (solo esa vez). |
| P5 | Campos de registro | Nombre, email, contraseña, club (lo que sea razonable) |
| P6 | Fechas sin timezone | Tratarlas siempre como `America/Argentina/Buenos_Aires` (decisión técnica por defecto) |

---

## REQUIREMENTS

### R1 — Corrección de errores (Fase 1)

**Backend**
- R1.1: `server.js` ya monta `/api/juego-libre` ✅ (verificado en el código actual). No hay problema aquí.
- R1.2: `NODE_TLS_REJECT_UNAUTHORIZED='0'` ya solo se activa en `!production` ✅.
- R1.3: `/auth/login-dev` **no existe** en el código actual ✅.
- R1.4: El middleware `autenticar.js` **ya es funcional** (verifica JWT, puebla `req.userId`, `req.userTipo`) ✅. Necesita agregar `req.user` con forma canónica `{id, rol, club_id}`.
- R1.5: `socioId` ya sale de `req.userId` (token) en `turnosController.js` ✅. Verificar que **todos** los endpoints lo hagan (admin.js y adminTurnos.js tienen acceso con service key, eso es correcto).
- R1.6: Contrato de respuesta unificado `{ ok, data }` / `{ ok: false, mensaje }` — varios routers usan `{ error }` plano. Normalizar.
- R1.7: `juego_libre` inscribir: ya tiene manejo de race condition con unique_violation ✅. El `nombre_sede` ya hace join a `sedes` ✅. El filtro de sede del frontend necesita cargarse desde la API.

**Frontend**
- R1.8: `main.jsx` ya usa `App` con `BrowserRouter` ✅. No hay backslashes en imports.
- R1.9: `App.jsx` ya tiene `BrowserRouter + Routes + rutas protegidas` ✅.
- R1.10: `useJuegoLibre.js` — verificar nombre del archivo.
- R1.11: `MisTurnos.jsx` — comparación de fechas en UTC en vez de Argentina.
- R1.12: `TurnoCard.jsx` — "Azul" y "Entrenamiento" hardcodeados; texto del modal de cancelación.
- R1.13: `DetalleJuegoLibre.jsx` — "mesas disponibles" y "apto para todos" hardcodeados.
- R1.14: Reemplazar `alert()` por Toast en toda la app.
- R1.15: ESLint con 0 errores.

### R2 — Categorías / niveles (Fase 2)

- R2.1: Migración idempotente de 5 a 8 categorías (pendiente aprobación P1).
- R2.2: Constante única `src/constants/categorias.js`.
- R2.3: Componente `<CategoriaBadge />` reemplaza todos los badges hardcodeados.
- R2.4: Filtro por categoría en listado de entrenamientos.
- R2.5: Badge especial "Apto para todos" (nivel NULL en turno).

### R3 — Sistema de diseño (Fase 3)

- R3.1: `src/styles/tokens.css` como única fuente de verdad de la paleta.
- R3.2: Tema claro y oscuro completos con contraste AA.
- R3.3: CSS Modules por componente; sin hex sueltos fuera de tokens.css.
- R3.4: Componentes base en `src/components/ui/`.
- R3.5: Pantallas de Bienvenida, Login y Registro con identidad visual de la imagen.
- R3.6: Estados loading/vacío/error/éxito en cada pantalla.
- R3.7: Accesibilidad WCAG AA (contraste, foco, áreas táctiles 44px, aria-label).
- R3.8: Responsive mobile-first (360px), max-width en desktop.
- R3.9: Íconos lucide-react (reemplazar emojis).
- R3.10: Página `/design-system` solo en desarrollo.

### R4 — Funcionalidad (Fase 4)

- R4.1: Entrenador: ver sus turnos con detalle completo; dar alta/baja de socios; crear turnos con cupo y categoría.
- R4.2: Socio: ver sus turnos, categoría y créditos; ver entrenamientos de su categoría; solicitar unirse (recurrente/puntual); anotarse directo con crédito y cupo; lista de espera sin cupo.
- R4.3: Admin: mismas vistas que entrenador sobre todos los turnos + gestión de bonos. (Confirmar alcance con P4.)
- R4.4: Créditos: lógica de generación al cancelar; vencimiento a fin de mes; arrastre última semana; uso de crédito para anotarse. Constantes en `configuracion_club`.
- R4.5: Notificaciones: lista de espera notifica al liberarse un cupo; pantalla de notificaciones; indicador de no leídas en BottomNav.

---

## DESIGN

### Arquitectura general

```
Frontend (React 19 + Vite)          Backend (Express 5 + Supabase service key)
┌─────────────────────────┐         ┌─────────────────────────────────────────┐
│  src/                   │ JWT     │  server.js                              │
│  ├─ styles/tokens.css   │ ──────► │  rutas/*.js                             │
│  ├─ constants/          │         │  src/controllers/*.js                   │
│  ├─ components/         │         │  src/services/*.js                      │
│  │   ├─ ui/             │         │  src/middlewares/autenticar.js           │
│  │   └─ domain/         │         │  src/config/db.js (único cliente SB)    │
│  ├─ pages/              │         └─────────────────────────────────────────┘
│  ├─ context/            │                    │
│  ├─ hooks/              │                    ▼
│  └─ lib/apiClient.js    │         Supabase (PostgreSQL)
└─────────────────────────┘
```

### Middleware de autenticación (a completar)

```javascript
// src/middlewares/autenticar.js — forma canónica
req.user = { id, rol: tipo_usuario_id, club_id }
// requireRole(...roles) helper exportado del mismo archivo
```

### Modelo de estados de socio_turno (migración propuesta)

```
activo            → inscripto y confirmado
pendiente         → solicitud enviada, esperando aprobación del entrenador
cancelado_a_tiempo → canceló con ≥24 hs → genera crédito de recupero
cancelado_tarde   → canceló con <24 hs → no genera crédito
baja_entrenador   → el entrenador lo dio de baja → genera crédito (SUPUESTO: siempre)
lista_espera      → sin cupo; en lista_espera_turno
```

### Flujo de inscripción a un turno

```
Socio selecciona turno de su categoría
        │
        ├─ Modalidad: "solo ese día"
        │       ├─ Cupo libre Y crédito disponible → activo (directo)
        │       ├─ Cupo libre SIN crédito → pendiente (espera entrenador) [SUPUESTO configurable]
        │       └─ Sin cupo → lista_espera
        │
        └─ Modalidad: "todas las semanas"
                └─ Siempre → pendiente (espera entrenador) [SUPUESTO, confirmar P4]
```

### Flujo de cancelación y créditos

```
Socio/Entrenador cancela inscripción de una clase
        │
        ├─ ¿Faltan ≥ horas_anticipacion_cancelacion (default: 24 hs)?
        │       └─ SÍ → estado: cancelado_a_tiempo
        │               → crear creditos_clase:
        │                     mes_periodo = mes de la clase
        │                     ¿fecha de la clase está en los últimos dias_ultima_semana_mes días del mes?
        │                       └─ SÍ → fecha_vencimiento = fin del mes siguiente (arrastre 1 vez)
        │                       └─ NO → fecha_vencimiento = fin del mes actual
        │
        └─ NO → estado: cancelado_tarde (baja_entrenador si lo hizo el entrenador)
                → no se genera crédito
```

### Lista de espera

```
Cupo se libera (cancelación de cualquier tipo)
        │
        └─ Buscar entradas en lista_espera_turno ORDER BY created_at ASC
                └─ Para cada socio en orden:
                        → crear notificación "Hay un lugar disponible en tu turno"
                        → marcar notificado_at (necesita columna — SUPUESTO migración)
                → El primer socio que confirme ocupa el cupo (control concurrencia)
                → Los demás quedan en lista o desisten
```

### Paleta de colores (tomada de la imagen)

```
Primario claro:  #1976D2 (azul medio, parte superior del degradado)
Primario:        #1565C0 (azul medio-oscuro)
Primario oscuro: #0D3B8C (azul oscuro, parte inferior del degradado)
Texto sobre primario: #FFFFFF
Botón primario: fondo blanco, texto #0D3B8C
Botón secundario: fondo translúcido (~rgba(255,255,255,0.15)), borde rgba(255,255,255,0.5), texto blanco
```

> Los valores exactos deben muestrearse de la imagen con precisión. Los valores anteriores son aproximados.

---

## TASKS

> ⚠️ **NO ejecutar hasta confirmar las preguntas bloqueantes P1–P6.**
> Después de tu confirmación ordeno las tareas, resuelvo dependencias y empezamos de a una con commit por tarea.

Las tareas están agrupadas por fase. Dentro de cada fase están en orden de dependencia.

---

### FASE 0 — Migraciones de base de datos (prerequisito de todo lo demás)

#### Tarea 0.1 — Migración `configuracion_club`
**Prerequisito:** Aprobación P2.
- Agregar columnas `clave`, `valor`, `descripcion` a `configuracion_club`.
- Constraint UNIQUE `(club_id, clave)`.
- Seed inicial: `horas_anticipacion_cancelacion=24`, `dias_ultima_semana_mes=7`, `vigencia_aviso_lista_espera_horas=48`.
- Script idempotente y reversible en `scripts/migraciones/001_configuracion_club.sql`.
- **Archivos:** `scripts/migraciones/001_configuracion_club.sql`

#### Tarea 0.2 — Migración `socio_turno.estado`
**Prerequisito:** Aprobación P3, DESPUÉS de tarea 0.1.
- Agregar columna `estado_texto text` con valores `'activo'`, `'pendiente'`, `'cancelado_a_tiempo'`, `'cancelado_tarde'`, `'baja_entrenador'`, `'lista_espera'`.
- Backfill: `estado=true → 'activo'`, `estado=false → 'pendiente'`.
- Mantener columna `estado` boolean existente durante período de transición.
- Constraint CHECK en `estado_texto`.
- Script idempotente en `scripts/migraciones/002_socio_turno_estado.sql`.
- **Archivos:** `scripts/migraciones/002_socio_turno_estado.sql`

#### Tarea 0.3 — Migración `creditos_clase`
**Prerequisito:** Aprobación P3, DESPUÉS de tarea 0.2.
- Agregar columna `arrastrado boolean DEFAULT false` para marcar créditos que pasaron al mes siguiente.
- Agregar columna `cancelado_por text` (`'socio'`, `'entrenador'`) para distinguir quién canceló.
- Script idempotente en `scripts/migraciones/003_creditos_clase.sql`.
- **Archivos:** `scripts/migraciones/003_creditos_clase.sql`

#### Tarea 0.4 — Migración `lista_espera_turno`
**Prerequisito:** DESPUÉS de tarea 0.2.
- Agregar columna `notificado_at timestampz DEFAULT NULL` para registrar cuándo se avisó al socio.
- Script idempotente en `scripts/migraciones/004_lista_espera_turno.sql`.
- **Archivos:** `scripts/migraciones/004_lista_espera_turno.sql`

#### Tarea 0.5 — Migración niveles (8 categorías)
**Prerequisito:** Aprobación P1 con la tabla de equivalencias confirmada.
- Insertar o actualizar filas en `niveles` para tener 8 categorías.
- NO eliminar filas existentes si tienen FK activas.
- Script idempotente en `scripts/migraciones/005_niveles_8cat.sql`.
- **Archivos:** `scripts/migraciones/005_niveles_8cat.sql`

---

### FASE 1 — Corrección de errores (en paralelo con Fase 0)

#### Tarea 1.1 — Normalizar middleware y contrato de respuesta
- Actualizar `src/middlewares/autenticar.js`: poblar `req.user = { id, rol, club_id }` además de los campos actuales.
- Exportar `requireRole(...roles)` helper.
- Crear helper `responder(res, status, { ok, data?, mensaje? })` en `src/lib/responder.js`.
- No romper los routers existentes (agregar responder gradualmente).
- **Test manual:** login válido → `req.user` correcto; token inválido → 401.
- **Archivos:** `src/middlewares/autenticar.js`, `src/lib/responder.js`

#### Tarea 1.2 — Corrección de fechas en MisTurnos.jsx
- Reemplazar comparación `fecha_inicio.slice(0,10)` con conversión a `America/Argentina/Buenos_Aires`.
- Helper `toDateAR(isoString)` en `src/lib/fecha.js`.
- Quitar `console.log` de producción.
- Proteger contra `turno.turnos` nulo.
- **Test manual:** turno con `fecha_inicio` en la noche → agrupa en el día correcto en AR.
- **Archivos:** `src/lib/fecha.js`, `src/pages/MisTurnos/MisTurnos.jsx`

#### Tarea 1.3 — TurnoCard: datos reales y texto correcto
- Reemplazar "Azul" hardcodeado por datos del turno (`nivel_minimo_id`, join a `niveles`).
- Reemplazar "Entrenamiento" hardcodeado por `tipo_turno.nombre`.
- Corregir texto del modal: "Cancelar con ≥24 hs → recuperás el crédito" / "Cancelar ahora → perdés la clase".
- **Archivos:** `src/components/TurnoCard/TurnoCard.jsx`

#### Tarea 1.4 — Renombrar UseJuegoLibre.js y fix alert()
- Renombrar `src/hooks/UseJuegoLibre.js` → `src/hooks/useJuegoLibre.js`.
- Reemplazar todos los `alert()` en la app por un componente Toast simple (puede ser básico aquí; se reemplaza con el Toast definitivo en Fase 3).
- Crear `src/components/ui/Toast.jsx` básico.
- **Archivos:** `src/hooks/useJuegoLibre.js`, `src/components/ui/Toast.jsx`, todos los archivos que usan `alert()`

#### Tarea 1.5 — Sedes dinámicas en JuegoLibre
- El filtro de sede del frontend debe cargarse desde `GET /api/sedes` (ya existe el endpoint).
- Eliminar `<option value="1|2">` hardcodeados.
- **Archivos:** `src/pages/JuegoLibre/JuegoLibre.jsx`

#### Tarea 1.6 — ESLint 0 errores
- Corregir todos los errores de ESLint.
- Verificar con `npm run lint`.
- **Archivos:** varios

---

### FASE 2 — Categorías (después de confirmar P1 y ejecutar Tarea 0.5)

#### Tarea 2.1 — Constante de categorías
- Crear `src/constants/categorias.js` con array de 8 categorías: `{ id, nombre, orden, color }`.
- Los `id` deben coincidir con los `id` reales en `niveles` después de la migración.
- **Archivos:** `src/constants/categorias.js`

#### Tarea 2.2 — Componente CategoriaBadge
- Crear `src/components/ui/CategoriaBadge.jsx` (y `.module.css`).
- Props: `nivelId` o `nivelNombre`; variantes: `size="sm|md|lg"`.
- Badge especial cuando `nivelId === null`: "Apto para todos" (color neutro).
- Contraste AA en ambos temas.
- **Archivos:** `src/components/ui/CategoriaBadge.jsx`, `src/components/ui/CategoriaBadge.module.css`

#### Tarea 2.3 — Reemplazar badges hardcodeados
- Reemplazar el badge "Azul" en `TurnoCard.jsx` y `DetalleAlumnoEntrenador.jsx` por `<CategoriaBadge />`.
- **Archivos:** `src/components/TurnoCard/TurnoCard.jsx`, `src/pages/entrenador/DetalleAlumnoEntrenador/DetalleAlumnoEntrenador.jsx`

#### Tarea 2.4 — Filtro por categoría en entrenamientos
- Agregar filtro de categoría en la pantalla de entrenamientos del socio.
- Solo mostrar turnos de la categoría del socio o aptos para todos (nivel NULL).
- Backend: `GET /api/turnos/entrenamientos?nivel_id=X` con lógica de nivel.
- **Archivos:** `rutas/turnos.js`, página de entrenamientos del socio

---

### FASE 3 — Sistema de diseño (puede arrancar en paralelo con Fase 1)

#### Tarea 3.1 — tokens.css
- Crear `src/styles/tokens.css` con toda la paleta derivada de la imagen.
- Definir variables CSS: primario, primario-oscuro, primario-claro, éxito, peligro, advertencia, 8 tokens de categoría, neutros, texto, borde, fondo, superficie.
- Tema claro (`:root`) y oscuro (`[data-theme="dark"]`).
- Verificar contraste AA.
- Limpiar `index.css` de tokens dispersos y plantilla Vite.
- **Archivos:** `src/styles/tokens.css`, `src/index.css`

#### Tarea 3.2 — Componentes base ui/
- Implementar en orden de dependencia:
  1. `Button` (primary/secondary/danger/ghost, loading/disabled)
  2. `Input`, `Select`
  3. `Card`
  4. `Badge`
  5. `Spinner`, `Skeleton`
  6. `EmptyState`, `ErrorState`
  7. `Modal`, `ConfirmDialog`
  8. `Toast` (definitivo, reemplaza el de Tarea 1.4)
  9. `Avatar`, `AvatarGroup`
  10. `Tabs`, `ProgressBar`
  11. `AppLayout`, `PageHeader`
  12. `BottomNav` (único, con items por rol)
- CSS Modules por componente. Sin hex fuera de tokens.css.
- **Archivos:** `src/components/ui/*`

#### Tarea 3.3 — Pantalla de Bienvenida (Splash)
- Rediseñar `src/pages/Splash/Splash.jsx` con la identidad visual de la imagen.
- Degradado vertical azul. Logo placeholder. Wordmark "SNOP". Tagline cursiva.
- Botones "Iniciar sesión" y "Registrarse".
- **Archivos:** `src/pages/Splash/Splash.jsx`, `src/pages/Splash/Splash.module.css`

#### Tarea 3.4 — Login y Registro
- Rediseñar con el sistema de diseño.
- Validación client-side básica.
- Estados loading/error.
- **Archivos:** `src/pages/login/login.jsx`, `src/pages/registro/registro.jsx`

#### Tarea 3.5 — Migrar páginas principales al sistema de diseño
- Aplicar tokens, AppLayout, PageHeader, BottomNav a las páginas principales.
- Orden: Inicio → MisTurnos → JuegoLibre → Perfil → Notificaciones.
- Estados loading/vacío/error obligatorios.
- Reemplazar emojis por lucide-react.
- **Archivos:** páginas indicadas y sus CSS

#### Tarea 3.6 — Migrar páginas de entrenador y admin
- Aplicar sistema de diseño a todas las páginas de entrenador y admin.
- **Archivos:** `src/pages/entrenador/*`, `src/pages/Admin/*`

#### Tarea 3.7 — Página /design-system
- Solo accesible en `NODE_ENV !== 'production'` o ruta no indexada.
- Mostrar todos los componentes, variantes, 8 categorías, ambos temas.
- **Archivos:** `src/pages/DesignSystem/DesignSystem.jsx`

---

### FASE 4 — Funcionalidad

#### Tarea 4.1 — Lógica de cancelación y créditos (backend)
**Prerequisito:** Tareas 0.1, 0.2, 0.3.
- Refactorizar `cancelarTurno` en `src/services/turnosService.js`.
- Leer `horas_anticipacion_cancelacion` de `configuracion_club`.
- Calcular tiempo hasta la clase en `America/Argentina/Buenos_Aires`.
- Si ≥ X horas: estado `cancelado_a_tiempo`, crear `creditos_clase` con fecha_vencimiento correcta.
- Si < X horas: estado `cancelado_tarde`.
- Idempotencia: no crear crédito duplicado si ya existe para `(user_id, turno_origen_id)`.
- **Archivos:** `src/services/turnosService.js`, `rutas/turnos.js`

#### Tarea 4.2 — Lista de espera y notificaciones (backend)
**Prerequisito:** Tarea 4.1, Tarea 0.4.
- Al cancelar un turno: notificar al primer socio de `lista_espera_turno` ORDER BY `created_at`.
- Control de concurrencia: el primer socio en confirmar ocupa el cupo.
- Endpoint `POST /api/turnos/:turnoId/lista-espera` y `DELETE` ya existen; revisar y completar.
- **Archivos:** `src/services/turnosService.js`, `rutas/turnos.js`, `rutas/notificaciones.js`

#### Tarea 4.3 — Inscripción de socio a turno (backend + frontend)
**Prerequisito:** Tarea 4.1.
- Endpoint `POST /api/turnos/:turnoId/inscribir` con body `{ modalidad: 'recurrente'|'puntual' }`.
- Lógica: puntual + cupo + crédito → activo directo; sin cupo → lista_espera; recurrente → pendiente.
- Frontend: modal de selección de modalidad en la pantalla de entrenamientos.
- **Archivos:** `rutas/turnos.js`, pantalla de entrenamientos del socio

#### Tarea 4.4 — Alta/baja de socio por entrenador (backend + frontend)
**Prerequisito:** Tarea 4.1.
- Endpoints en `rutas/entrenador.js`: dar de alta y de baja a un socio de un turno específico.
- Baja del entrenador genera crédito con misma lógica (configuración `baja_entrenador_genera_credito`).
- Registrar `bajado_por` (user_id del entrenador) y `bajado_at` — SUPUESTO: necesita columnas en `socio_turno`.
- Frontend: botones en la lista de socios del turno.
- **Archivos:** `rutas/entrenador.js`, `src/pages/entrenador/MisClasesEntrenador/MisClasesEntrenador.jsx`

#### Tarea 4.5 — Bloque CreditosResumen (frontend)
**Prerequisito:** Tarea 4.1.
- Componente `src/components/domain/CreditosResumen.jsx`.
- Muestra: créditos totales del mes, usados, disponibles para recupero, arrastrados, fecha de vencimiento.
- Integrar en pantalla de perfil del socio y en detalle de turno.
- **Archivos:** `src/components/domain/CreditosResumen.jsx`, `src/pages/Perfil/Perfil.jsx`

#### Tarea 4.6 — Notificaciones frontend
**Prerequisito:** Tarea 4.2.
- Indicador de no leídas en BottomNav (badge con número).
- Pantalla `/notificaciones` con lista y botón "Marcar todas como leídas".
- **Archivos:** `src/pages/Notificaciones/Notificaciones.jsx`, `src/components/BottomNav/BottomNav.jsx`

#### Tarea 4.7 — Crear turnos (entrenador)
- Entrenador puede crear turnos con: fecha/hora, sede, mesa, tipo, `capacidad_maxima`, `nivel_minimo_id` (o "apto para todos").
- Validaciones: no solapar con otro turno suyo en la misma mesa; fecha no pasada.
- **Archivos:** pantalla de creación de horario en entrenador, `rutas/entrenador.js`

---

## CRITERIOS DE ACEPTACIÓN POR FASE

### Fase 1
- [ ] ESLint: 0 errores
- [ ] Fechas de MisTurnos correctas en UTC-3
- [ ] Ningún alert() en producción
- [ ] TurnoCard sin hardcodes de nivel o tipo

### Fase 2
- [ ] `CategoriaBadge` renderiza las 8 categorías + "Apto para todos"
- [ ] Filtro de categoría en entrenamientos solo muestra turnos de la categoría del socio
- [ ] 0 hex de color de categoría fuera de tokens.css o categorias.js

### Fase 3
- [ ] 0 hex sueltos fuera de tokens.css
- [ ] 0 duplicación de estilos de tarjeta/botón/header/nav
- [ ] Contraste AA verificado en ambos temas
- [ ] Áreas táctiles ≥ 44px
- [ ] Responsive en 360px
- [ ] Página /design-system muestra todos los componentes

### Fase 4
- [ ] Cancelación con ≥24 hs genera crédito; con <24 hs no
- [ ] Crédito vence a fin del mes; en última semana, pasa al mes siguiente
- [ ] Lista de espera notifica en orden FIFO; el primero en confirmar gana
- [ ] No se generan créditos duplicados (idempotencia)
- [ ] El socioId siempre sale del JWT; nunca de params o body

---

## SUPUESTOS PENDIENTES DE CONFIRMACIÓN

| # | Supuesto | Impacto si cambia |
|---|----------|-------------------|
| S1 | `nivel_minimo_id = NULL` en turno = apto para todos | Lógica de filtro de entrenamientos |
| S2 | Inscripción recurrente siempre requiere aprobación del entrenador | Flujo de inscripción |
| S3 | Baja del entrenador siempre genera crédito (con o sin 24 hs) — configurable | Tarea 4.4 |
| S4 | Crédito de última semana se arrastra solo una vez | creditos_clase.arrastrado boolean |
| S5 | `socio_turno.bajado_por` y `bajado_at` son columnas nuevas | Requiere migración adicional |
| S6 | `lista_espera_turno.notificado_at` es columna nueva | Tarea 0.4 |
| S7 | `turno_excepciones` tiene columnas adicionales (motivo, tipo, user_id) | No verificado por timeout |
| S8 | `turnos.fecha_inicio` fue ingresada como hora Argentina (UTC-3) | Corrección de fechas |

---

## ORDEN DE EJECUCIÓN RECOMENDADO

```
Respuestas P1–P6
    │
    ├─► 0.1 configuracion_club
    ├─► 0.2 socio_turno estado
    ├─► 0.3 creditos_clase
    ├─► 0.4 lista_espera_turno
    └─► 0.5 niveles (espera P1)

    En paralelo:
    ├─► 1.1 middleware
    ├─► 1.2 fechas
    ├─► 1.3 TurnoCard
    ├─► 1.4 alert → Toast
    ├─► 1.5 sedes dinámicas
    └─► 1.6 ESLint

    Después de Fase 1:
    ├─► 3.1 tokens.css
    ├─► 3.2 componentes base
    ├─► 3.3 Splash
    ├─► 3.4 Login/Registro
    ├─► 3.5 páginas principales
    ├─► 3.6 entrenador/admin
    └─► 3.7 design-system

    Después de 0.1–0.4:
    ├─► 4.1 cancelación + créditos
    ├─► 4.2 lista espera + notifs
    ├─► 4.3 inscripción
    ├─► 4.4 alta/baja entrenador
    ├─► 4.5 CreditosResumen
    ├─► 4.6 notificaciones frontend
    └─► 4.7 crear turnos
```
