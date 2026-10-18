# Diseño: otros ingresos y fecha de la transferencia

Estado: **fecha de la transferencia hecha**; **otros ingresos descartado por
ahora**. Fecha: 2026-10-18.

## Problema

En la conciliación de octubre la caja de la app no cerraba con la billetera
(Lemon) por dos cosas que la app no tiene dónde guardar:

1. **Plata que entra y no es una expensa.** Los rendimientos de la billetera
   fueron ~$55.000 en seis meses. Hoy la única forma de que la caja los refleje
   es tocar el saldo inicial, que es justo lo que había roto todo.
2. **Cuándo se hizo la transferencia.** Un pago guarda cuándo lo avisó el
   vecino y cuándo lo aprobó el admin, pero no cuándo transfirió. Para cruzar
   contra el extracto, que está ordenado por fecha, es el dato que falta.

## Otros ingresos

> **Descartado por ahora (2026-10-18).** Los rendimientos de la billetera no se
> van a anotar: son muchos movimientos chicos. Sin eso, la tabla no tiene un
> uso concreto. Se acepta que con el tiempo la billetera tenga algo más que la
> caja de la app, por los rendimientos. Lo de abajo queda como diseño por si
> aparece otro caso (una devolución, una donación).

### Modelo de datos

Tabla nueva **`other_income`**, con la misma forma que `expenditure` pero sin
proveedor:

| Columna | Tipo | Para qué |
|---|---|---|
| `id` | uuid | |
| `consorcioId` | uuid → `consorcio.id` | |
| `date` | timestamp | Cuándo entró la plata |
| `description` | text | "Rendimientos de octubre" |
| `amountCents` | integer | |
| `category` | enum `other_income_category`: `rendimientos`, `devolucion`, `otro` | |
| `receiptUrl` | text, nullable | |
| `notes` | text, nullable | |
| `createdByUserId` | text → `user.id` | |
| `createdAt` | timestamp | |

### Cómo entra en las cuentas

- **Caja** (Balance y panel del admin): saldo inicial + cobrado **+ otros
  ingresos** − gastos.
- **Balance mes a mes**: una línea "Otros ingresos" en el mes de su fecha
  (como los gastos), y el resultado del mes la suma. Si un mes no tiene, la
  línea no aparece.
- **Reporte CSV**: una sección "OTROS INGRESOS", igual que la de gastos.

### Dónde se carga

En **Gestionar gastos**, un botón "Cargar ingreso" que abre el mismo
formulario que un gasto, con las tres categorías. La lista de gastos muestra
también los ingresos, marcados en verde, para que el admin vea en un solo
lugar todo lo que movió la cuenta. Los vecinos los ven en Balance.

### Los rendimientos de antes

Ya están absorbidos en el saldo inicial de $366.413 (ver la conciliación del
17/10/2026). **Se cargan solo los de 18/10/2026 en adelante.** Si se cargaran
los anteriores, habría que bajar el saldo inicial en lo mismo.

## Fecha de la transferencia

- Columna nueva **`transferredAt`** (timestamp, nullable) en `payment_claim` y
  en `credit_deposit`. Nullable porque los avisos de antes no la tienen.
- En "Ya pagué" y en el adelanto, un campo "¿Qué día transferiste?", con hoy
  por defecto.
- En Aprobar pagos, la tarjeta muestra **"Transfirió el 05/10"** grande, al
  lado del monto. "Avisó el" queda chico debajo.
- Cuando el admin registra un pago a mano, también la pide.

## Migración

La fecha de la transferencia es un cambio en la base: hay que correr `pnpm db:push` contra
producción **antes** de que el código llegue a `main`, porque Vercel deploya
solo y las pantallas leerían columnas que todavía no existen. Son dos
columnas nullable agregadas: no tocan datos existentes.

## Decisiones abiertas

- **Cargar ingresos dentro de Gastos o en una pantalla aparte**, si algún día
  se hace. Propuesta: dentro de Gastos, porque es donde el admin ya va a
  cargar lo que movió la cuenta.
