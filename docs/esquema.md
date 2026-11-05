# Esquema real de la base de datos SNOP

> Fuente de verdad: consultas directas a Supabase via service key.
> Relevamiento ejecutado el 16/10/2026. Actualizado 2026-11-05: migraciones 001–005 aplicadas y verificadas contra la base.
> Las columnas de tablas vacías (*) se infieren de errores de constraint + pruebas de insert/select.
> `[SUPUESTO]` = columna no verificada directamente; debe confirmarse antes de usarla.

---

## Leyenda rápida de roles

| tipo_usuario_id | nombre      |
|-----------------|-------------|
| 1               | socio       |
| 2               | entrenador  |
| 3               | admin       |

---

## Tablas

### `users`

Usuarios del sistema (socios, entrenadores y admins).

| Columna          | Tipo       | Notas                                                                 |
|------------------|------------|-----------------------------------------------------------------------|
| `id`             | int (PK)   |                                                                       |
| `tipo_usuario_id`| int (FK)   | → `tipo_usuario.id`                                                   |
| `club_id`        | int (FK)   | → `clubes.id`                                                         |
| `nombre`         | text       |                                                                       |
| `email`          | text       | único                                                                 |
| `password`       | text       | hash bcrypt ($2b$) — hay usuarios de dev con password en texto plano  |
| `telefono`       | text       | nullable                                                              |
| `foto_url`       | text       | nullable                                                              |
| `activo`         | boolean    | true = habilitado por el club                                         |
| `estado_cuenta`  | text       | `'activa'`, `'pendiente'`, `'desactivada'`                           |
| `nivel_id`       | int (FK)   | nullable → `niveles.id`; categoría del socio                          |
| `cuota_al_dia`   | boolean    |                                                                       |
| `fecha_alta`     | timestampz | nullable                                                              |
| `rating`         | numeric    | promedio de `ratings_entrenador` (solo entrenadores)                  |
| `clases_dadas`   | int        | contador de clases dadas (solo entrenadores)                          |
| `auth_id`        | uuid       | nullable; reservado para Supabase Auth si se migra                    |
| `eliminado_en`   | timestampz | nullable; ≠ NULL = baja lógica (no puede loguearse, no aparece en listados) |
| `eliminado_por`  | bigint (FK)| nullable → `users.id` del admin que dio la baja                       |
| `created_at`     | timestampz |                                                                       |

**Observación:** `estado_cuenta` es la fuente de verdad del estado del socio; `activo` queda como flag de soft-delete.

---

### `tipo_usuario`

Catálogo de roles.

| id | nombre      |
|----|-------------|
| 1  | socio       |
| 2  | entrenador  |
| 3  | admin       |

---

### `niveles`

Categorías de juego. **8 filas activas** tras la migración 005. **1ª = la más alta (élite), 8ª = la más baja.**

| id | nombre        | orden |
|----|---------------|-------|
| 1  | 1ª categoría  | 1     |
| 2  | 2ª categoría  | 2     |
| 3  | 3ª categoría  | 3     |
| 4  | 4ª categoría  | 4     |
| 5  | 5ª categoría  | 5     |
| 6  | 6ª categoría  | 6     |
| 7  | 7ª categoría  | 7     |
| 8  | 8ª categoría  | 8     |

**Columnas:** `id`, `nombre`, `orden`

**Nota de migración:** Los socios que tenían los 5 niveles viejos (Principiante/Azul/Intermedio/Rojo/Avanzado) quedaron con `nivel_id = NULL` — reasignar manualmente desde Gestión de Niveles en la app.

**Conflicto resuelto** ✓ — migración 005 aplicada el 2026-10-19.

---

### `clubes`

Un solo club activo (id=1, "SNOP Club").

| Columna      | Tipo       |
|--------------|------------|
| `id`         | int (PK)   |
| `nombre`     | text       |
| `direccion`  | text       |
| `ciudad`     | text       |
| `logo_url`   | text       |
| `activo`     | boolean    |
| `created_at` | timestampz |

**Fuera de alcance.** No modificar.

---

### `sedes`

Ubicaciones del club.

| Columna           | Tipo     | Notas                   |
|-------------------|----------|-------------------------|
| `id`              | int (PK) |                         |
| `club_id`         | int (FK) | → `clubes.id`           |
| `nombre`          | text     | "Belgrano", "Palermo"   |
| `direccion`       | text     | nullable                |
| `horario_apertura`| time     | nullable                |
| `horario_cierre`  | time     | nullable                |
| `activo`          | boolean  |                         |

**Datos actuales:** id=1 "Belgrano", id=2 "Palermo".

---

### `mesas`

Mesas de juego por sede.

| Columna    | Tipo     | Notas             |
|------------|----------|-------------------|
| `id`       | int (PK) |                   |
| `sede_id`  | int (FK) | → `sedes.id`      |
| `numero`   | int      | número de mesa    |
| `activa`   | boolean  |                   |

---

### `tipo_turno`

Catálogo de tipos de turno.

| id | nombre        |
|----|---------------|
| 1  | Entrenamiento |
| 2  | Clase         |
| 3  | Juego Libre   |

---

### `turnos`

Clases y horarios del club.

| Columna           | Tipo       | Notas                                                              |
|-------------------|------------|--------------------------------------------------------------------|
| `id`              | int (PK)   |                                                                    |
| `tipo_turno_id`   | int (FK)   | → `tipo_turno.id`                                                  |
| `sede_id`         | int (FK)   | → `sedes.id`                                                       |
| `mesa_id`         | int (FK)   | → `mesas.id`                                                       |
| `user_id`         | int (FK)   | → `users.id` (entrenador responsable)                              |
| `fecha_inicio`    | timestamp  | sin timezone en la muestra ("2026-06-23 10:00:00")                 |
| `fecha_fin`       | timestamp  |                                                                    |
| `duracion_min`    | int        |                                                                    |
| `estado`          | boolean    | true = activo / false = cancelado                                  |
| `capacidad_maxima`| int        | cupo máximo definido al crear el turno                             |
| `nivel_minimo_id` | int (FK)   | nullable → `niveles.id`; si NULL = apto para todos [SUPUESTO]      |
| `nivel_maximo_id` | int (FK)   | nullable → `niveles.id`; rango superior de categoría [SUPUESTO]   |
| `recurrente`      | boolean    | false en los datos de muestra                                      |
| `dia_semana`      | int/text   | nullable; para turnos recurrentes                                  |
| `hora_inicio`     | time       | nullable; para turnos recurrentes                                  |
| `hora_fin`        | time       | nullable; para turnos recurrentes                                  |
| `activo`          | boolean    | distinto de `estado`; parece redundante [SUPUESTO: `activo` = visible, `estado` = no cancelado] |
| `created_at`      | timestampz |                                                                    |

**Observación crítica:** `fecha_inicio` en la muestra llega SIN timezone ("2026-06-23 10:00:00"), no como timestamptz. Esto causa el bug de comparación UTC vs. Argentina. Verificar el tipo de columna en Supabase.

---

### `socio_turno`

Inscripciones de socios a turnos.

| Columna            | Tipo       | Notas                                                               |
|--------------------|------------|---------------------------------------------------------------------|
| `id`               | int (PK)   |                                                                     |
| `turno_id`         | int (FK)   | → `turnos.id`                                                       |
| `user_id`          | int (FK)   | → `users.id` (socio)                                                |
| `estado`           | boolean    | **true** = activo/confirmado; **false** = pendiente o cancelado     |
| `fecha_inscripcion`| timestampz |                                                                     |

| `estado_texto`     | text       | ✅ migración 001: `activo` · `pendiente` · `cancelado_a_tiempo` · `cancelado_tarde` · `baja_entrenador` |

**Regla:** `estado` (boolean) y `estado_texto` se escriben SIEMPRE juntos y SOLO desde `src/services/socioTurnoService.js`. `estado = true` ⇔ `estado_texto = 'activo'`.
**Ojo:** no tiene `created_at` — ordenar por `fecha_inscripcion`.

---

### `tipo_estado`

Catálogo de estados (hoy sin uso en `socio_turno`).

| id | estado        |
|----|---------------|
| 1  | Confirmado\n  |
| 2  | Cancelado\n   |
| 3  | Pendiente\n   |

> **Nota:** los valores tienen `\n` al final — bug de datos. Limpiar antes de usar.

---

### `lista_espera_turno`

Lista de espera por turno.

| Columna         | Tipo       | Notas                                                   |
|-----------------|------------|---------------------------------------------------------|
| `id`            | int (PK)   |                                                         |
| `turno_id`      | int (FK)   | → `turnos.id`; NOT NULL                                 |
| `user_id`       | int (FK)   | → `users.id`; NOT NULL                                  |
| `created_at`    | timestampz | default `now()`; define el orden FIFO                   |
| `estado`        | text       | `'esperando'` (default) · `'promovido'` · `'cancelado'` |
| `notificado_at` | timestampz | cuándo se lo promovió/avisó                             |

**Reglas:** orden FIFO = `ORDER BY created_at` (la posición se calcula al leer, no se guarda). Todo el código filtra `estado = 'esperando'`. No insertar `fecha_inscripcion` ni `posicion` (no existen). Si el socio vuelve a anotarse se reutiliza su fila (vuelve a `esperando` con `created_at = now()`).

---

### `turno_excepciones`

Cancelaciones o cambios puntuales de turnos recurrentes. **0 filas.**

| Columna           | Tipo       | Notas                                                 |
|-------------------|------------|-------------------------------------------------------|
| `id`              | int (PK)   | generado automáticamente                              |
| `turno_id`        | int (FK)   | → `turnos.id`; NOT NULL                               |
| `fecha_excepcion` | date       | NOT NULL — la fecha de la clase que se cancela/modifica|
| `estado`          | text       | default `'cancelado'` (inferido del error de insert)  |
| `created_at`      | timestampz | generado automáticamente                              |

**SUPUESTO:** Puede tener columnas adicionales como `motivo`, `tipo` (`'cancelado'`, `'modificado'`), `user_id`. No verificadas por timeout de conexión.

---

### `creditos_clase`

Créditos de recupero generados al cancelar con anticipación.

| Columna           | Tipo       | Notas                                                             |
|-------------------|------------|-------------------------------------------------------------------|
| `id`              | int (PK)   |                                                                   |
| `user_id`         | int (FK)   | → `users.id` (socio)                                              |
| `turno_origen_id` | int (FK)   | → `turnos.id`; turno que se canceló                               |
| `mes_periodo`     | text       | formato `'YYYY-MM'`; mes al que pertenecía la clase cancelada     |
| `usado`           | boolean    | false = disponible; true = ya usado                               |
| `turno_usado_id`  | int (FK)   | nullable → `turnos.id`; turno en el que se usó el crédito         |
| `fecha_generado`  | timestampz | cuándo se creó el crédito                                         |
| `fecha_vencimiento`| timestampz| hasta cuándo es válido                                            |
| `arrastrado`      | boolean    | ✅ verificado: true si la clase cayó en la última semana del mes   |

**Reglas:** no hay columna `estado`; `vencido` se calcula en runtime (`!usado && fecha_vencimiento < now()`), nunca se marca `usado = true` al vencer. Un crédito por `(user_id, turno_origen_id)`. Si se arrastra, `mes_periodo` es el mes siguiente.

---

### `bonos`

Paquete mensual pagado (ej. 8 clases/mes) asignado por el admin.

| Columna            | Tipo       | Notas                                          |
|--------------------|------------|------------------------------------------------|
| `id`               | int (PK)   |                                                |
| `socio_id`         | int (FK)   | → `users.id`                                   |
| `tipo`             | text       | `'mensual'` (valor único observado)            |
| `creditos_total`   | int        | cantidad de clases del paquete (ej. 8)         |
| `creditos_usados`  | int        |                                                |
| `fecha_inicio`     | date       | `'YYYY-MM-DD'`                                 |
| `fecha_vencimiento`| date       | `'YYYY-MM-DD'`                                 |
| `activo`           | boolean    |                                                |
| `notas`            | text       | nullable                                       |
| `creado_por`       | int (FK)   | → `users.id` (admin)                           |
| `created_at`       | timestampz |                                                |

---

### `bono_turno`

Vínculo entre un bono y un turno usado (pivot de consumo de crédito del bono).

| Columna    | Tipo       | Notas                          |
|------------|------------|--------------------------------|
| `id`       | int (PK)   |                                |
| `bono_id`  | int (FK)   | → `bonos.id`                   |
| `turno_id` | int (FK)   | → `turnos.id`                  |
| `socio_id` | int (FK)   | → `users.id`                   |
| `fecha_uso`| timestampz |                                |

**Observación:** Este pivot registra el uso de crédito del **bono** (paquete pagado). Es distinto de `creditos_clase` que registra créditos de **recupero**.

---

### `notificaciones`

Avisos in-app por usuario.

| Columna  | Tipo       | Notas                                                |
|----------|------------|------------------------------------------------------|
| `id`     | int (PK)   |                                                      |
| `user_id`| int (FK)   | → `users.id`                                         |
| `titulo` | text       |                                                      |
| `mensaje`| text       |                                                      |
| `tipo`   | text       | ej. `'clase_confirmada'`, `'clase_rechazada'`, etc.  |
| `leida`  | boolean    | false = no leída                                     |
| `fecha`  | timestampz |                                                      |
| `link`   | text       | nullable; ruta del frontend a la que navegar         |

---

### `configuracion_club`

Constantes configurables del club. **0 filas actualmente.**

| Columna      | Tipo       | Notas                                                          |
|--------------|------------|----------------------------------------------------------------|
| `id`         | int (PK)   | verificado                                                     |
| `club_id`    | int (FK)   | verificado → `clubes.id`                                       |
| `updated_at` | timestampz | verificado                                                     |
| ~~`clave`~~  | —          | **NO EXISTE** — columna probada, ausente                       |
| ~~`valor`~~  | —          | **NO EXISTE** — columna probada, ausente                       |

> **PROBLEMA CRÍTICO:** La tabla existe pero está vacía y sin columnas `clave`/`valor`. Las reglas de negocio (24 hs anticipación, 7 días última semana, etc.) deben guardarse aquí. **Se requiere migración** para definir el esquema real de esta tabla antes de implementar la lógica de créditos.
>
> **SUPUESTO de migración propuesto:**
> ```sql
> ALTER TABLE configuracion_club
>   ADD COLUMN IF NOT EXISTS clave text NOT NULL,
>   ADD COLUMN IF NOT EXISTS valor text NOT NULL,
>   ADD COLUMN IF NOT EXISTS descripcion text,
>   ADD CONSTRAINT configuracion_club_club_id_clave_key UNIQUE (club_id, clave);
> ```
> Valores iniciales a insertar:
> - `horas_anticipacion_cancelacion` = `'24'`
> - `dias_ultima_semana_mes` = `'7'`
> - `vigencia_aviso_lista_espera_horas` = `'48'`

---

### `juego_libre`

Espacios de juego libre (no clases particulares).

| Columna            | Tipo       | Notas                                  |
|--------------------|------------|----------------------------------------|
| `id`               | int (PK)   |                                        |
| `titulo`           | text       | ej. "Juego Libre"                      |
| `sede_id`          | int (FK)   | → `sedes.id`                           |
| `fecha_inicio`     | timestampz |                                        |
| `fecha_fin`        | timestampz |                                        |
| `capacidad_maxima` | int        |                                        |
| `niveles_habilitados` | int[]   | IDs de `niveles`; `{}` = apto para todos (migración 002) |
| `activo`           | boolean    |                                        |
| `created_at`       | timestampz |                                        |

---

### `inscripciones_juego_libre`

Inscripciones a eventos de juego libre.

| Columna             | Tipo       | Notas                                       |
|---------------------|------------|---------------------------------------------|
| `id`                | int (PK)   |                                             |
| `evento_id`         | int (FK)   | → `juego_libre.id`                          |
| `socio_id`          | int (FK)   | → `users.id`                                |
| `fecha_inscripcion` | timestampz |                                             |
| `estado`            | text       | `'activo'`, `'cancelado'`                   |

---

### `comunicados`

Mensajes del club a socios/entrenadores.

| Columna        | Tipo       | Notas                                                          |
|----------------|------------|----------------------------------------------------------------|
| `id`           | int (PK)   |                                                                |
| `titulo`       | text       |                                                                |
| `mensaje`      | text       |                                                                |
| `destinatarios`| text[]     | segmentos: `'todos'`, `'con_deuda'`, `'entrenadores'`, `'nivel_<id>'`. Varios a la vez (migración 004). Valores viejos `'nivel_rojo'`/`'nivel_azul'` quedaron inactivos. |
| `enviado_por`  | int (FK)   | → `users.id` (admin)                                           |
| `fecha`        | timestampz |                                                                |

**Fuera de alcance.** No modificar.

---

### `solicitudes_club`

Solicitudes de ingreso al club.

| Columna             | Tipo       | Notas                                       |
|---------------------|------------|---------------------------------------------|
| `id`                | int (PK)   |                                             |
| `user_id`           | int (FK)   | → `users.id`                                |
| `club_id`           | int (FK)   | → `clubes.id`                               |
| `estado`            | text       | `'pendiente'`, `'aceptada'`, `'rechazada'`  |
| `fecha_solicitud`   | timestampz |                                             |
| `fecha_resolucion`  | timestampz | nullable                                    |
| `resuelto_por`      | int (FK)   | nullable → `users.id` (admin)               |

**Fuera de alcance.** No modificar.

---

### `torneos`

| Columna               | Tipo          | Notas                               |
|-----------------------|---------------|-------------------------------------|
| `id`                  | int (PK)      |                                     |
| `nombre`              | text          |                                     |
| `sede_id`             | int (FK)      | → `sedes.id`                        |
| `fecha_inicio`        | timestampz    |                                     |
| `fecha_fin`           | timestampz    |                                     |
| `modalidad`           | text          | `'singles'`, `'dobles'`             |
| `capacidad_maxima`    | int           |                                     |
| `niveles_habilitados` | int[]         | IDs de `niveles`; `{}` = apto para todos (migración 002 convirtió los nombres) |
| `activo`              | boolean       |                                     |
| `creado_por`          | int (FK)      | → `users.id`                        |

**Fuera de alcance.** No modificar.

---

### `inscripciones_torneo`

| Columna             | Tipo       | Notas                      |
|---------------------|------------|----------------------------|
| `id`                | int (PK)   |                            |
| `torneo_id`         | int (FK)   | → `torneos.id`             |
| `socio_id`          | int (FK)   | → `users.id`               |
| `estado`            | text       | `'activo'`                 |
| `fecha_inscripcion` | timestampz |                            |

**Fuera de alcance.** No modificar.

---

### `ratings_entrenador`

| Columna        | Tipo       | Notas                   |
|----------------|------------|-------------------------|
| `id`           | int (PK)   |                         |
| `socio_id`     | int (FK)   | → `users.id`            |
| `entrenador_id`| int (FK)   | → `users.id`            |
| `turno_id`     | int (FK)   | → `turnos.id`           |
| `estrellas`    | int        | 1–5                     |
| `comentario`   | text       | nullable                |
| `created_at`   | timestampz |                         |

**Fuera de alcance.** No modificar.

---

## Decisiones de modelo (resueltas)

| Tema | Decisión |
|------|----------|
| Roles | `tipo_usuario`: 1 socio · 2 entrenador · 3 admin |
| Categorías | 8 filas en `niveles`; **1ª = élite (orden 1)**, 8ª = principiante. Los socios con niveles viejos quedaron con `nivel_id = NULL` |
| Estado de inscripción | `socio_turno.estado_texto` (5 valores) + boolean `estado` sincronizado por `socioTurnoService`. `tipo_estado` no se usa |
| Lista de espera | `lista_espera_turno` con `estado` y FIFO por `created_at` |
| Créditos | `creditos_clase`; `vencido` en runtime; `arrastrado` para última semana |
| Zona horaria | `turnos.fecha_inicio` puede venir sin offset ("2025-06-05 10:00:00"): siempre leer con `parseFechaAR()` (asume -03:00) |
| Constantes | `configuracion_club` sin confirmar; defaults en código: 24 hs anticipación, 7 días última semana |
| Turnos recurrentes | Una fila por turno con `dia_semana`/`hora_inicio`/`hora_fin` y `fecha_inicio` = próxima ocurrencia. Las semanas canceladas van a `turno_excepciones` |

---

## Relaciones clave (FK)

```
users ──────────────── tipo_usuario (tipo_usuario_id)
users ──────────────── clubes (club_id)
users ──────────────── niveles (nivel_id)

sedes ──────────────── clubes (club_id)
mesas ──────────────── sedes (sede_id)

turnos ─────────────── tipo_turno (tipo_turno_id)
turnos ─────────────── sedes (sede_id)
turnos ─────────────── mesas (mesa_id)
turnos ─────────────── users (user_id) [entrenador]
turnos ─────────────── niveles (nivel_minimo_id)
turnos ─────────────── niveles (nivel_maximo_id)

socio_turno ────────── turnos (turno_id)
socio_turno ────────── users (user_id) [socio]

lista_espera_turno ─── turnos (turno_id)
lista_espera_turno ─── users (user_id) [socio]

turno_excepciones ──── turnos (turno_id)

creditos_clase ─────── users (user_id)
creditos_clase ─────── turnos (turno_origen_id)
creditos_clase ─────── turnos (turno_usado_id) [nullable]

bonos ──────────────── users (socio_id)
bonos ──────────────── users (creado_por)
bono_turno ─────────── bonos (bono_id)
bono_turno ─────────── turnos (turno_id)
bono_turno ─────────── users (socio_id)

notificaciones ─────── users (user_id)

solicitudes_club ───── users (user_id)
solicitudes_club ───── clubes (club_id)

ratings_entrenador ─── users (socio_id)
ratings_entrenador ─── users (entrenador_id)
ratings_entrenador ─── turnos (turno_id)

inscripciones_juego_libre ── juego_libre (evento_id)
inscripciones_juego_libre ── users (socio_id)

inscripciones_torneo ── torneos (torneo_id)
inscripciones_torneo ── users (socio_id)

comunicados ────────── users (enviado_por)
torneos ────────────── sedes (sede_id)
juego_libre ────────── sedes (sede_id)
```


---

## Historial de migraciones

Todas aplicadas y verificadas contra la base el 2026-11-05. La carpeta `migrations/` se borró a pedido: la 001 está en el historial de git (commit `0efbcc5`); las 002–005 no llegaron a commitearse, así que esta tabla es su registro.

| # | Qué hizo |
|---|----------|
| 001 | `socio_turno.estado_texto` + CHECK + backfill |
| 002 | `juego_libre.niveles_habilitados int[]`; `torneos.niveles_habilitados` text[] → int[] (la vieja quedó como `niveles_habilitados_texto_old`) |
| 003 | `users.eliminado_en` / `eliminado_por` |
| 004 | `comunicados.destinatarios` text → text[] |
| 005 | `lista_espera_turno.estado` / `created_at` / `notificado_at` |

Serie anterior (octubre, `scripts/migraciones/`, borrada en `b04e3a4`): niveles 8 categorías (aplicada 2026-10-19), `creditos_clase.arrastrado` (verificada). Estado de `configuracion_club.clave/valor`: sin confirmar — el código usa defaults (24 hs / 7 días) si no hay filas.

**Para cambios futuros de esquema:** escribir el SQL idempotente con ROLLBACK comentado, mostrárselo al usuario antes de aplicarlo en el SQL Editor de Supabase, y actualizar este archivo.
