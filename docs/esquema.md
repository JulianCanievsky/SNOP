# Esquema real de la base de datos SNOP

> Fuente de verdad: consultas directas a Supabase via service key.
> Relevamiento ejecutado el 16/10/2026.
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

**Problema confirmado:** `estado` es boolean, no enum. El código lo usa como: `true` = confirmado, `false` = pendiente/cancelado (ambiguos). `tipo_estado` existe (Confirmado/Cancelado/Pendiente) pero NO se usa aquí.

**SUPUESTO:** Migrar `estado` de boolean a referencia a `tipo_estado.id` o a un tipo texto con valores definidos. Esto es prerequisito para el sistema de créditos, lista de espera y lógica de cancelación.

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

Lista de espera por turno. **0 filas.**

| Columna       | Tipo       | Notas                             |
|---------------|------------|-----------------------------------|
| `id`          | int (PK)   | verificado (se genera en insert)  |
| `turno_id`    | int (FK)   | → `turnos.id`; NOT NULL           |
| `user_id`     | int (FK)   | → `users.id`; NOT NULL [SUPUESTO] |
| `created_at`  | timestampz | generado automáticamente          |

**SUPUESTO:** No tiene columna `posicion` explícita — el orden se infiere por `created_at`. Puede necesitar añadirse para garantizar FIFO ante inserts simultáneos.
**SUPUESTO:** No tiene columna `notificado_at` para registrar cuándo se avisó al socio.

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

**Observación:** No tiene columna `estado` (solo `usado` boolean). Para implementar `vencido` como estado se necesitaría migrar o calcularlo en runtime comparando `fecha_vencimiento` con NOW().

**SUPUESTO faltante:** No hay columna para identificar si el crédito fue arrastrado al mes siguiente (`arrastrado` boolean o similar).

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
| `destinatarios`| text       | `'todos'`, `'con_deuda'`, `'entrenadores'`, `'nivel_<id>'` (ej. `'nivel_3'` para 3ª categoría). Valores viejos `'nivel_rojo'`/`'nivel_azul'` en registros existentes son inactivos. |
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
| `niveles_habilitados` | text[]        | array de nombres de nivel           |
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

## Verificación de hipótesis del brief

| Hipótesis | Resultado |
|-----------|-----------|
| `tipo_usuario` = roles | ✅ CONFIRMADO: 1=socio, 2=entrenador, 3=admin |
| `tipo_estado` = estados de `socio_turno` | ❌ NO se usa en `socio_turno`. Existe la tabla pero `socio_turno.estado` es boolean. Los valores tienen `\n` al final (bug de datos). |
| `lista_espera_turno` = lista de espera | ✅ CONFIRMADO: tabla existe, FK a `turnos` y `users`, 0 filas, necesita columna `notificado_at` [SUPUESTO] |
| `notificaciones` = avisos in-app | ✅ CONFIRMADO: `id, user_id, titulo, mensaje, tipo, leida, fecha, link` |
| `creditos_clase` = créditos de recupero | ✅ CONFIRMADO con: `user_id, turno_origen_id, mes_periodo, usado, turno_usado_id, fecha_generado, fecha_vencimiento` |
| `bonos/bono_turno` = paquete mensual pagado | ✅ CONFIRMADO: `bonos` = paquete (8 clases/mes), `bono_turno` = pivot de uso |
| `turno_excepciones` = cancelaciones puntuales | ✅ PARCIAL: tiene `turno_id` y `fecha_excepcion`, estado default `'cancelado'`. Columnas opcionales no verificadas. |
| `configuracion_club` = constantes configurables | ⚠️ EXISTE pero VACÍA y sin columnas `clave/valor`. Requiere migración. |
| `nivel NULL = apto para todos` | ✅ PROBABLE: `nivel_minimo_id` y `nivel_maximo_id` son nullable en `turnos`. Confirmar semántica exacta. |
| `socio_turno.estado` boolean suficiente | ❌ INSUFICIENTE: no distingue entre cancelado-a-tiempo, cancelado-tarde, pendiente, etc. Requiere migración. |

---

## CONFLICTOS A RESOLVER ANTES DE IMPLEMENTAR

### CONFLICTO 1 — Niveles: 5 filas vs. 8 categorías requeridas

La tabla `niveles` tiene 5 filas (Principiante/Azul/Intermedio/Rojo/Avanzado).
El club opera con **8 categorías**: 1ª, 2ª, 3ª, 4ª, 5ª, 6ª, 7ª y 8ª categoría.

**Pregunta bloqueante antes de migrar:**
1. ¿Es 1ª categoría la MÁS ALTA o la MÁS BAJA?
2. ¿Cuál es la equivalencia entre las 5 filas actuales y las 8 categorías nuevas?

**Propuesta de equivalencia tentativa (NO aplicar hasta confirmar):**

| id actual | nombre actual | Posible equivalencia  | Orden nuevo |
|-----------|---------------|----------------------|-------------|
| —         | (nuevo)       | 8ª categoría         | 1           |
| —         | (nuevo)       | 7ª categoría         | 2           |
| —         | (nuevo)       | 6ª categoría         | 3           |
| 1         | Principiante  | 5ª categoría         | 4           |
| 2         | Azul          | 4ª categoría         | 5           |
| 3         | Intermedio    | 3ª categoría         | 6           |
| 4         | Rojo          | 2ª categoría         | 7           |
| 5         | Avanzado      | 1ª categoría         | 8           |

Esto asume: **1ª = la más alta** (como en el tenis de mesa real, donde 1ª es la élite).
Confirmar antes de ejecutar la migración.

### CONFLICTO 2 — `socio_turno.estado` boolean vs. estados ricos

El campo actual (boolean) no puede expresar: `activo`, `cancelado_a_tiempo`, `cancelado_tarde`, `baja_entrenador`, `lista_espera`, `pendiente`.

**SUPUESTO de migración propuesto:**
```sql
-- 1. Agregar columna de estado texto con default que mapea el boolean actual
ALTER TABLE socio_turno
  ADD COLUMN IF NOT EXISTS estado_tipo text
    GENERATED ALWAYS AS (CASE WHEN estado = true THEN 'activo' ELSE 'pendiente' END) STORED;
-- (esto es provisional; la migración real implica backfill y renombrar)
```
La migración definitiva debe ser idempotente y reversible. Ver spec para el plan detallado.

### CONFLICTO 3 — `configuracion_club` vacía

Las columnas `clave/valor` no existen. Todas las constantes de negocio están hardcodeadas en el código.
Requiere migración antes de implementar la lógica de créditos.

### CONFLICTO 4 — `turnos.fecha_inicio` sin timezone

La muestra devuelve `"2026-06-23 10:00:00"` (sin offset). Si la columna es `timestamp` (sin tz), Supabase la trata como UTC. El frontend la interpreta como local y pierde 3 horas. Verificar tipo exacto de la columna en Supabase.

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
