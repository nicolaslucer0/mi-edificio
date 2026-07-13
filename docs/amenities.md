# Diseño: amenities y reservas

Estado: **propuesta** (pre-desarrollo). Fecha: 2026-07-13.

## Problema

Los consorcios tienen espacios comunes (pileta, terraza, SUM). Queremos que el
admin los cargue como **amenities** y que los vecinos **reserven por hora**,
viendo las reservas de los demás para no pisarse.

## Decisiones tomadas

- **Reserva = rango de horas consecutivas** (desde–hasta), en horas enteras
  (ej. 14 a 17h).
- **Cada amenity se configura por separado:** horario disponible, duración
  máxima, y el flag "se puede reservar".
- Las amenities las **crea/edita/borra el admin** del consorcio.
- Reserva cualquier **propietario o inquilino** de una unidad del consorcio,
  solo sobre amenities con el flag reservable.
- **Todos los del consorcio ven todas las reservas** (para no pisarse). Regla
  dura: **sin solapamientos**.
- Cancela **el que reservó** (reservas futuras) o el **admin** (cualquiera).

## Modelo de datos

- **`amenities`**: `id, consorcioId, name, description?, reservable (bool),
  openHour (0–23), closeHour (1–24, fin exclusivo), maxHours, createdAt`.
- **`amenityReservations`**: `id, amenityId, reservedByUserId, unitId?,
  day (texto "YYYY-MM-DD"), startHour, endHour, createdAt`.
  Índice por `(amenityId, day)` para el chequeo de solape.

> **Horas enteras + `day` como texto** (no timestamps) para evitar líos de zona
> horaria: el display y la lógica de solape trabajan con enteros. Consistente
> con cómo el resto de la app maneja fechas.

**Chequeo de solape (al reservar):** existe conflicto si hay otra reserva de la
misma amenity, mismo `day`, con `startHour < nuevoFin` y `endHour > nuevoInicio`.

**Validaciones de la reserva:** `startHour < endHour`; ambas dentro de
`[openHour, closeHour]`; `endHour - startHour <= maxHours`; no en el pasado; la
amenity es `reservable`; el usuario es owner/tenant de una unidad del consorcio;
**máximo 2 reservas activas** (aún no terminadas) por vecino y por amenity.

## Autorización

- **Ver** amenities + reservas: cualquier miembro del consorcio (owner/tenant/admin).
- **Gestionar** amenities (crear/editar/borrar): admin del consorcio.
- **Reservar**: owner/tenant de una unidad del consorcio.
- **Cancelar**: el que reservó (si es futura) o el admin.

## Flujos / UX

### Vecino — `/amenities` (scopeado al consorcio actual)

- Lista de amenities reservables del consorcio.
- Al entrar a una: **vista de día** — elegís fecha, ves la grilla de horas del
  día con las franjas ocupadas (y de quién), y reservás un rango libre con dos
  selectores **desde / hasta** (limitados al horario de la amenity y a las horas
  libres).
- "Mis reservas" próximas, con botón cancelar.

### Admin — `/admin/[consorcioId]/amenities`

- CRUD de amenities: nombre, descripción, flag reservable, horario
  (open/close), duración máxima.
- Puede ver y cancelar cualquier reserva.

### Navegación

- Ítem "Amenities" para vecinos; acceso a la gestión desde el panel del admin.

## Límites y reglas adicionales (decididas)

1. **Sin cupo por unidad**, pero **máximo 2 reservas activas simultáneas por
   vecino y por amenity** (una reserva "activa" = todavía no terminó). Al
   reservar se cuentan las reservas futuras del vecino en esa amenity; si ya
   tiene 2, se rechaza.
2. **Anticipación:** sin tope — cualquier fecha futura.
3. **Unidad en la reserva** cuando el vecino tiene varias en el consorcio: se
   registra la primera.

## Impacto en archivos (estimado)

- `db/schema.ts` — tablas `amenities` y `amenityReservations` + migración
  (`boolean` nuevo en imports).
- `lib/queries/amenities.ts` (nuevo) — listar amenities, reservas por día,
  "mis reservas", chequeo de solape.
- `lib/actions/amenities.ts` (nuevo) — CRUD de amenity (admin), crear/cancelar
  reserva (vecino/admin) con todas las validaciones.
- `app/(app)/amenities/**` — lista + vista de día + reservar (vecino).
- `app/(app)/admin/[consorcioId]/amenities/**` — gestión (admin).
- Componentes: grilla de día, form de amenity, tarjeta de reserva.
- Nav (`app-shell`) — ítem "Amenities".
