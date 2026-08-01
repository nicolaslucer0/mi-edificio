# Diseño: estado de pagos visible para los vecinos

Estado: **propuesta** (pre-desarrollo). Fecha: 2026-08-01.

## Problema

El administrador quiere que los vecinos puedan ver quién tiene deuda, para que la
presión social ayude a cobrar. Es una necesidad real —la mora encarece la expensa
del resto— pero mal implementado se vuelve un escrache.

El objetivo es dar la información con el **mínimo de exposición personal
necesario** y que el consorcio pueda apagarla por completo.

## Decisiones tomadas

- **Se identifica la unidad, nunca la persona.** El listado dice "3° B", jamás el
  nombre del propietario o inquilino. Esto ya es lo que hace la liquidación de
  expensas en papel; el salto a nombres es el que convierte información en escrache.
- **Tres niveles de visibilidad**, configurables por el admin del consorcio, con
  `off` como default:
  - `off` — los vecinos no ven nada (estado actual).
  - `resumen` — solo el agregado anónimo: "14 de 20 unidades al día · faltan
    cobrar $340.000".
  - `por_unidad` — listado de unidades con deuda vencida, **con monto**, ordenado
    por piso y departamento.
- **Con montos** en el nivel `por_unidad` (sin flag aparte: si el admin llega a
  ese nivel, muestra monto).
- **Período de gracia configurable, default 10 días.** Una unidad recién aparece
  cuando pasaron 10 días del vencimiento. No se marca a nadie por pagar tarde
  una semana.
- **Quien informó "ya pagué" no aparece.** Los pagos pendientes de validación se
  descuentan, igual que ya hace `getDebtForUser`.
- **La sección vive en `/balance`**, que ya es la página de transparencia del
  consorcio. Hay que entrar a buscarla.
- **El admin decide si va algo en el home** (flag aparte). Si lo activa, aparece
  un **widget con el resumen** y link a `/balance` — nunca el listado por unidad,
  en ningún nivel. El widget entra por el sistema de
  [widgets del home](./home-widgets.md).
- **Se activa en silencio.** No hay mail de aviso ni cartel de "activado el
  DD/MM": el admin lo prende y los vecinos lo ven la próxima vez que entran.
- **Sin ranking.** Orden por piso y depto, misma tipografía para todos. Ordenar
  por monto convertiría el listado en un podio.
- **Simetría:** tu propia unidad aparece en el listado, marcada como "tu unidad".
  El que mira también está expuesto.

## Modelo de datos

Tres columnas nuevas en **`consorcios`**:

| Columna | Tipo | Default | Para qué |
|---|---|---|---|
| `debtVisibility` | enum `debt_visibility` (`off`, `resumen`, `por_unidad`) | `off` | Nivel de exposición |
| `debtGraceDays` | `integer` | `10` | Días después del vencimiento antes de figurar |
| `debtOnHome` | `boolean` | `false` | Mostrar el widget de resumen en el home |

No hay tablas nuevas: la deuda ya se deriva de `expenses` + `paymentClaims` +
`units.creditCents`.

## Cálculo de la deuda por unidad

Para cada unidad del consorcio:

1. Expensas con `period <= período actual` y `status != 'pagado'` (las de meses
   futuros no son deuda; `rechazado` sí lo es).
2. Adeudado por expensa: `amountCents − paidCents − claims pendientes`, con piso
   en 0.
3. **Filtro de gracia:** solo cuentan las expensas con
   `dueDate + debtGraceDays < hoy`.
4. Restar el saldo a favor de la unidad (`units.creditCents`) del total. Es
   defensivo: `credits.ts` ya aplica el crédito automáticamente a las deudas, así
   que tener ambos a la vez es un borde raro.
5. La unidad entra al listado si el total queda > 0. Se muestran **monto total
   adeudado** y **cantidad de expensas vencidas**.

Los pasos 1 y 2 son exactamente la lógica de `getDebtForUser`
(`src/lib/queries/expenses.ts:81`) — conviene extraer un helper compartido que
calcule el adeudado por expensa descontando claims pendientes, y que tanto la
query personal como la del consorcio lo consuman.

## Autorización

- **Ver el estado de pagos del consorcio:** cualquier miembro del consorcio
  (owner / tenant / admin), y solo si `debtVisibility != 'off'`. Scopeado al
  consorcio actual (`getCurrentConsorcioId`).
- **Cambiar la configuración:** admin del consorcio (y super_admin).
- El admin sigue viendo el detalle completo **con nombres** en
  `/admin/[consorcioId]/reportes`, independientemente de este toggle. Ahí no
  cambia nada.

## Flujos / UX

### Vecino — sección en `/balance`

Título: **"Estado de pagos del consorcio"**. Nunca se usa la palabra "morosos".

- Nivel `resumen`: una tarjeta con "14 de 20 unidades al día" y "Faltan cobrar
  $340.000".

> **"Al día" significa lo mismo en todos lados:** sin deuda vencida, contando
> toda la deuda y no solo la del mes. Es la misma idea que ya usa el home
> ("Estás al día"). El denominador son las unidades con expensas ya emitidas.
- Nivel `por_unidad`: la misma tarjeta de resumen + el listado debajo. Filas
  simples: `3° B · 2 meses · $85.000`. La fila de tu unidad lleva la marca
  "tu unidad".
- Si están todas al día: "Todas las unidades están al día 🎉" y no se lista nada.

### Vecino — widget en el home (solo si `debtOnHome`)

Widget `estado-de-pagos` (`span: "half"`, order 20) con el resumen: "14 de 20
unidades al día" y la acción "Ver detalle" hacia `/balance`. Sin monto destacado,
sin rojo, sin listado. Devuelve `null` —y por lo tanto no ocupa lugar en la
grilla— si el nivel es `off` o si `debtOnHome` está apagado. Contrato en
[widgets del home](./home-widgets.md).

### Admin — `/admin/[consorcioId]/estado-de-pagos`

Página nueva, con entrada en el panel del consorcio ("Estado de pagos" —
"Mostrar a los vecinos quién está al día").

- Selector de nivel con las tres opciones y una explicación en criollo de qué ve
  el vecino en cada una.
- Campo de días de gracia.
- Checkbox "Mostrar el resumen en la pantalla de inicio" (habilitado solo si el
  nivel no es `off`). Es lo que prende el widget del home.
- **Qué expone cada opción**: debajo del form, con los datos reales del
  consorcio, se ve el resumen y el listado que saldrían. No depende de lo que
  esté seleccionado en el form: muestra las dos cosas siempre, así el admin
  compara antes de elegir. Usa los días de gracia guardados, o sea que para
  probar otro valor hay que guardar.
- Al pasar a `por_unidad`, el botón de guardar queda deshabilitado hasta tildar
  "entiendo que cada vecino va a ver qué unidades deben y cuánto, incluida la
  suya". Solo aparece cuando el nivel todavía no era `por_unidad`.

## Límites y reglas adicionales

1. **Se puede "esconder" apretando "Ya pagué" sin haber pagado.** El claim
   pendiente descuenta la deuda y saca a la unidad del listado hasta que el admin
   lo rechace. Es el mismo comportamiento optimista que ya tiene el home y se
   acepta: el costo de exponer a alguien que sí pagó es peor que el de que
   alguien se esconda unos días. El admin ve los claims sin resolver en
   `/aprobar-pagos`.
2. **Unidades sin expensas cargadas** no aparecen ni cuentan en el "de 20".
3. **El total del resumen** cuenta unidades, no personas: una unidad con varios
   ocupantes cuenta una vez.
4. **Sin histórico.** El listado siempre refleja el estado de hoy; no se guarda
   quién debía el mes pasado.

## Decisiones abiertas

- **Días de gracia por default: 10.** Confirmar o cambiar.

## Orden de implementación

1. **Widgets del home** ([doc](./home-widgets.md)) — refactor sin cambio visual.
2. **Backend de este feature** — schema + migración + queries.
3. **UI** — sección en `/balance`, página de admin y widget del home.

## Impacto en archivos (estimado)

- `db/schema.ts` — enum `debt_visibility` + 3 columnas en `consorcios`.
- `lib/queries/debt-board.ts` (nuevo) — `getDebtBoard` (vecino, respeta nivel y
  permisos), `getDebtBoardConfig` y `getDebtBoardPreview` (admin).
- `lib/actions/admin.ts` — `updateDebtBoardSettings`.
- `components/debt-board.tsx` (nuevo) — tarjeta de resumen y listado por unidad,
  compartidos entre `/balance`, el widget y la vista del admin.
- `app/(app)/balance/page.tsx` — sección "Estado de pagos del consorcio".
- `components/widgets/estado-de-pagos.tsx` (nuevo) + entrada en el registry.
- `app/(app)/admin/[consorcioId]/estado-de-pagos/**` (nuevo) — página + form.
- `app/(app)/admin/[consorcioId]/page.tsx` — tarjeta nueva en el panel.

> **La migración es bloqueante para el deploy:** el home, `/balance` y el panel
> leen las columnas nuevas. Hay que correr `npm run db:push` antes de que este
> código llegue a producción.
</content>
</invoke>
