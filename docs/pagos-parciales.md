# Diseño: pagos parciales de expensas

Estado: **propuesta** (pre-desarrollo). Fecha: 2026-07-13.

## Problema

Hoy el pago es todo-o-nada: un `paymentClaim` no tiene monto, representa "pagué
la expensa entera". Queremos que un vecino pueda informar que pagó **una parte**
(ej. $5.000 de $10.000), ver claramente **cuánto falta**, y poder completar el
resto más adelante. Aplica igual a expensas ordinarias y extraordinarias.

## Modelo de datos (ledger)

Cada pago informado es una línea de un ledger; la expensa cachea el total pagado.

### Cambios de schema

- `paymentClaims.amountCents` — monto que **informa** el vecino en ese pago.
- `paymentClaims.confirmedAmountCents` (nullable) — monto que **valida el admin**
  al aprobar (por default = informado; el admin puede corregirlo, ver Decisión 2).
- `expenses.paidCents` — total pagado y validado. Se **recalcula** como
  `sum(confirmedAmountCents)` de los claims aprobados en cada aprobación/rechazo.
  No es un contador incremental → no se puede desincronizar.
- `expenseStatusEnum` — agregar el valor `parcial`.

`Falta = expenses.amountCents − expenses.paidCents`.

> **Sinergia:** cada claim ya puede tener su comprobante privado (feature de hoy),
> así que cada pago parcial queda con su propio comprobante.

## Estados y transiciones

`status` se **deriva** en cada resolución con esta precedencia y se guarda en la
columna para no romper los filtros existentes:

1. `paidCents >= amountCents` → **pagado**
2. existe un claim pendiente → **en_validacion**
3. `paidCents > 0` → **parcial**
4. existe un claim rechazado y ninguno aprobado → **rechazado**
5. si no → **pendiente**

Puntos clave:

- **Un rechazo NO borra lo ya pagado.** Solo se marca rechazado ese claim; la
  expensa se recalcula. Si tenías 5.000 aprobados y te rechazan otros 5.000,
  volvés a `parcial` con 5.000, no a `rechazado`.
- El vecino puede crear un nuevo claim mientras la expensa está en `parcial`
  (pagar lo que falta) o incluso `rechazado` (reintentar).

## Flujos

### Vecino — registrar pago

Elección explícita (más clara para usuarios mayores que un campo editable):

```
¿Registrar tu pago?
Mayo 2025 · Ordinaria · $10.000

  (•) Pagué todo — $10.000
  ( ) Pagué una parte
        Monto que transferí:  [ $ 5.000        ]
        → Te va a quedar pendiente $5.000

  Comprobante (opcional)   [ elegir archivo ]
  Notas (opcional)         [ ............... ]
              [  Confirmar  ]
```

- El monto parcial se **capa** al saldo que falta (Decisión 1). Pesos enteros,
  mínimo $1 (Decisión 3).
- Con un pago parcial aprobado, la tarjeta de la expensa muestra el progreso y
  precarga el saldo:

```
Mayo 2025 · Ordinaria — $10.000
✅ Pagaste $5.000  ·  Falta $5.000
▓▓▓▓▓▓▓░░░░░░░ (50%)
         [  Pagar lo que falta  ]
```

### Admin — validar pago

Tarjeta en "aprobar pagos": **"El vecino informó $5.000 de $10.000 · quedaría
$5.000"** + comprobante. El admin puede **ajustar el monto confirmado** (ej. ve
$4.800 en el extracto) antes de aprobar (Decisión 2). El confirmado se capa al
saldo restante (mantiene la regla de no sobrepago). Al aprobar/rechazar, el saldo
se recalcula solo.

## Cálculos afectados

- **Deuda mostrada** (`getDebtForUser`): pasa a
  `amountCents − paidCents − (claims pendientes)`. Así se mantiene el
  comportamiento optimista actual (informar un pago baja la deuda al instante);
  si el admin rechaza, la deuda reaparece.
- **Reportes** (tabla + CSV): nuevo estado `Parcial`, columnas pagado/falta, y el
  `% cobrado` usa `paidCents` en vez de contar expensas completas.
- **Recibo**: pasa de "comprobante único" a **estado de cuenta** de la expensa,
  con el detalle de cada pago (fecha, monto, comprobante).
- **Emails/notifs**: "pago parcial confirmado, te falta $X".

## Decisiones tomadas

1. **Sobrepago:** se capa al saldo restante en la v1. _Futuro:_ pago adelantado /
   saldo a favor como feature aparte.
2. **Admin ajusta el monto** confirmado al validar. Se guarda informado +
   confirmado para trazabilidad.
3. **Pesos enteros, mínimo $1.**
4. **v1:** iniciado por el vecino + validación del admin (con ajuste). _v2:_ el
   admin registra un pago parcial a mano (sin claim del vecino).

## Casos borde

- Múltiples propietarios/inquilinos de una unidad pueden aportar partes distintas;
  cada claim guarda quién pagó.
- Expensas futuras ("adelantar"): mismo flujo; no cuentan como deuda hasta el mes
  en curso (comportamiento actual se respeta).
- Último pago que completa el total → `pagado`, se dispara el recibo/estado final.

## Impacto en archivos (estimado)

- `src/lib/db/schema.ts` — columnas nuevas + enum + migración (`db:push`).
- `src/lib/actions/expensas.ts` — `claimPayment` acepta monto (+ cap).
- `src/lib/actions/admin.ts` — `approveClaim` acepta monto confirmado; ambos
  recalculan `paidCents` y el `status` derivado.
- `src/lib/queries/expenses.ts` — deuda con saldo restante; exponer `paidCents`.
- `src/components/claim-payment-button.tsx` — drawer con elección todo/parte.
- `src/components/claim-decision-card.tsx` — monto informado + ajuste.
- `src/app/(app)/expensas/**` — progreso + "pagar lo que falta".
- `src/app/(app)/admin/[consorcioId]/reportes/page.tsx` + `src/lib/reports.ts`
  — estado `Parcial`, pagado/falta, `% cobrado`.
- `src/components/expense-status-badge.tsx` — badge `Parcial`.
