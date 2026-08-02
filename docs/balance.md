# Diseño: balance del consorcio

Estado: **implementado**. Fecha: 2026-08-01.

## Problema

`/balance` mostraba tres números por mes —cobrado, gastado, saldo— y nada más.
Con eso no se puede responder lo que un vecino realmente quiere saber: si un mes
flojo fue por poca cobranza o porque se emitieron pocas expensas, cuánta gente
pagó, cuánto falta entrar.

Peor: **"cobrado" se calculaba como la suma de las expensas con estado
`pagado`**, así que un pago parcial contaba como cero. Medio consorcio pagando la
mitad figuraba como un mes sin un peso de ingreso.

## Decisiones tomadas

- **La unidad de la pantalla es el mes.** Todo lo que se muestra tiene un mes
  encima, salvo la caja (que es un acumulado y lo dice) y la deuda acumulada
  (idem, y va aparte).
- **Cobrado se calcula con `paidCents`**, no con el estado. Acotado con
  `least(paidCents, amountCents)`: el excedente de un sobrepago es saldo a favor
  de la unidad, no cobranza del período.
- **Las expensas se cuentan por período; los gastos, por fecha.** "La cobranza de
  agosto" es lo cobrado de las expensas de agosto, se haya pagado cuando se haya
  pagado. Es la lectura intuitiva ("de agosto se cobró el 80%") y la que usa el
  reporte del admin.
- **Una unidad "pagó el mes"** cuando cubrió todo lo que se le emitió en ese
  período, sumando ordinarias y extraordinarias.
- **Los meses vacíos no se listan.** Un consorcio recién cargado no muestra once
  tarjetas en cero.
- **El saldo inicial no se muestra.** Es de cuándo se empezó a usar la app, no
  información del consorcio: se carga desde "Datos de pago y saldo" y entra en la
  cuenta, nada más. Por eso la tarjeta de la caja quedó con el número solo — con
  el desglose de cobrado y gastado a la vista, la resta no cerraría y parecería
  un error.

## Secciones

1. **Plata del consorcio** — un número grande y nada más: saldo inicial + todo lo
   cobrado − todo lo gastado. Es acumulado, no de los últimos 12 meses.
2. **Este mes** — cuánto se emitió, cuánto se cobró (con barra y porcentaje),
   cuántas unidades pagaron de cuántas, cuánto falta cobrar, cuánto se gastó y el
   resultado.
3. **Meses anteriores** — hasta 12, la misma información comprimida en cuatro
   cifras: expensas, cobrado, gastado, resultado.
4. **Deuda acumulada** — solo si la administración activó el estado de pagos.
   Documentado en [estado de pagos](./estado-de-pagos.md).

Cierra con un link a `/gastos`, que ya tiene el detalle con filtros: acá no se
duplica el desglose por categoría.

## Consistencia con el panel del admin

El panel del consorcio mostraba "Saldo del consorcio" con el criterio viejo
(`status = 'pagado'` × `amountCents`) y "pendiente del mes" sin descontar lo ya
pagado. Los dos se corrigieron para usar el mismo cálculo que esta pantalla, así
el admin y el vecino ven el mismo número.

## Queries

- `getConsorcioCash(user, consorcioId)` — la caja acumulada.
- `getMonthlyFinancials(user, monthsBack, consorcioId)` — el mes a mes, del más
  reciente al más viejo. Una pasada por las expensas del rango y otra por los
  gastos; el resto se agrega en memoria, incluida la cuenta de unidades que
  cubrieron el mes.

Reemplazan a `getMonthlyBalance` y `getOpeningBalanceForUser`, que no quedaron
en uso.

## Impacto en archivos

- `lib/queries/balance.ts` — reescrito.
- `lib/queries/admin.ts` — cobrado y pendiente del mes con el criterio nuevo.
- `app/(app)/balance/page.tsx` — rediseño completo.
- `components/widgets/estado-de-pagos.tsx` — el widget del home pasa a mostrar la
  cobranza del mes en curso.
