# Diseño: widgets del home

Estado: **propuesta** (pre-desarrollo). Fecha: 2026-08-01.

## Problema

El home hoy es una lista de secciones hardcodeadas en `app/(app)/page.tsx`:
saludo, tarjeta de deuda, prompt de instalación y últimos movimientos. Cada cosa
nueva que queremos mostrar (estado de pagos del consorcio, próxima reserva,
pagos a aprobar para el admin) implica tocar ese archivo, decidir a mano dónde va
y copiar el estilo de la tarjeta de al lado.

Queremos que el home sea una **grilla de widgets**: cada uno se trae sus datos,
decide si corresponde mostrarse, y se acomoda solo en el lugar que le toca.

## Concepto

Un **widget** es un Server Component que:

1. recibe siempre el mismo par de props (`user`, `consorcioId`),
2. se trae sus propios datos,
3. **devuelve `null` si no corresponde mostrarlo** (y no deja hueco en la grilla),
4. se dibuja dentro de un shell común, `<WidgetCard>`, para que todos se parezcan.

El home deja de saber qué widgets existen: recorre un registry y los renderiza.

## Contrato

`src/components/widgets/types.ts`:

```ts
export interface WidgetProps {
  user: CurrentUser;
  consorcioId: string | null;
  searchParams: Record<string, string | undefined>;
}

export interface WidgetDef {
  id: string;                    // "deuda", "estado-de-pagos", "proxima-reserva"
  order: number;                 // de 10 en 10, para insertar sin renumerar todo
  roles?: readonly Role[];       // si está, solo esos roles lo ven
  Component: (props: WidgetProps) => ReactNode | Promise<ReactNode>;
}
```

`Component` admite sync o async: los widgets de datos son async (Server
Components), pero alguno puede ser un Client Component sincrónico que se
autogestiona —el prompt de instalación es exactamente ese caso.

El **ancho no está en el registry**: lo declara el propio widget en su
`<WidgetCard span="…">`. Es el único lugar donde puede estar sin desincronizarse,
porque es el widget el que dibuja (o no) su celda.

El filtro `roles` mira **todas** las membresías del usuario, no el rol principal:
alguien que es admin de un consorcio y propietario en otro ve los dos conjuntos
de widgets.

## Registry

`src/components/widgets/registry.ts` exporta el array ordenado. **Agregar un
widget = agregar un archivo y una entrada.** `page.tsx` no se toca nunca más.

| order | id | span | condición para aparecer |
|---|---|---|---|
| 10 | `deuda` | full | el usuario tiene unidad |
| 15 | `tu-anio` | full | tiene al menos una expensa en el año |
| 20 | `estado-de-pagos` | half | `debtVisibility != 'off'` y `debtOnHome` |
| 25 | `gastos-del-mes` | half | siempre (un mes sin gastos se muestra en cero) |
| 30 | `install-prompt` | full | no instalada y no descartada (client) |
| 80 | `ultimos-movimientos` | full | hay movimientos |

**Estado en la URL.** `searchParams` son los de la página del home. Un widget que
guarda estado ahí elige un nombre de parámetro y lo documenta en esta tabla, para
que dos widgets no se pisen. Hoy hay uno solo: **`mes`**, que mueve el mes de
`estado-de-pagos` (el que tiene las flechas) y que `gastos-del-mes` sigue, así
las dos tarjetas hablan siempre del mismo período.

Cambiar de mes es una navegación con `<Link>` sobre la misma ruta: Next no
vuelve a mostrar el `loading.tsx` para un cambio de search params, así que la
señal de que está cargando la da la flecha, que se convierte en spinner con
`useLinkStatus` (ver `components/month-nav-arrow.tsx`).

**Un widget con datos en cero se muestra igual, en cero.** Devolver `null` es
para cuando el widget no aplica —el vecino no tiene unidad, la administración no
activó el estado de pagos—, no para cuando la respuesta es "no hubo nada":
esconder la tarjeta hace parecer que el dato no existe.

El filtro por `roles` es lo que va a permitir widgets solo de admin (ej. "pagos a
aprobar") sin ensuciar el home del vecino.

## Layout

```tsx
<div className="mx-auto grid w-full max-w-2xl grid-cols-1 gap-7 sm:grid-cols-2">
  {widgetsForUser(user).map(({ id, Component }) => (
    <Component key={id} user={user} consorcioId={consorcioId} />
  ))}
</div>
```

- **Mobile: siempre una columna.** No negociable, es el uso real de la app.
- Desktop (`sm:`): dos columnas; `span: "full"` ocupa las dos (`sm:col-span-2`).
- `gap-7` es la separación que ya tenían las secciones del home; así el refactor
  no mueve nada en mobile.
- **El `span` lo aplica `<WidgetCard>`, no el `.map`.** Es lo que hace que un
  widget que devuelve `null` no deje una celda vacía: si no hay `WidgetCard`, no
  hay elemento de grilla. Por eso el `.map` no envuelve nada en un `div` propio.

El saludo ("Buenas tardes, Nico 👋") **no** es un widget: es el header de la
página y va arriba de la grilla.

## El shell: `<WidgetCard>`

Mismo rol que `PageHeader` para las pantallas internas — unifica el aspecto.

```tsx
<WidgetCard
  span="half"
  title="Estado de pagos"
  icon={Users}
  tone="teal"                        // mismos tonos que PageHeader
  action={{ href: "/balance", label: "Ver detalle" }}
>
  …contenido…
</WidgetCard>
```

Estructura que arma: `<section>` (la celda) → header opcional → `Card` con el
contenido → `footer` opcional debajo de la card.

- **El header va arriba de la card, no adentro**, que es como ya se veía
  "Últimos movimientos". Por eso el refactor no cambia nada visualmente.
- **La card crece con `flex-1`**, así dos widgets `half` en la misma fila
  terminan con la misma altura. Sin eso cada card mide lo que mide su contenido
  y la fila queda despareja.
- **El contenido va con `p-5`**, el mismo padding que las tarjetas del resto de
  la app. Un widget puede pisarlo (la lista de movimientos usa `px-5 py-1`
  porque sus filas ya traen el suyo), pero por defecto todos miden igual.
- Reusa `Card` de shadcn y la paleta de tonos, que se movió de `page-header.tsx`
  a `lib/tones.ts` para que header de pantalla y widget usen la misma
  (`violet | blue | green | amber | coral | teal`), con las clases literales —
  Tailwind no ve las interpoladas.
- `title`, `icon`, `action` y `footer` son **opcionales**.
- **`bare`**: no envuelve el contenido en una `Card`, para el widget que necesita
  la suya. Lo usa `deuda`, que es la pieza principal del home (número gigante,
  centrado, borde de color según el estado) y no lleva header.
- El `action` renderiza un `<Link>`; acepta `ariaLabel` para cumplir la regla de
  copy ("Ver todo" en pantalla, "Ver todas las expensas" para el lector).

**Excepción:** `install-prompt` no pasa por el shell. Decide en el cliente si
corresponde mostrarse, así que ningún Server Component puede saber de antemano
si va a ocupar una celda: dibuja su propia card con el `col-span` puesto, y
`null` cuando está oculto.

## Carga de datos

Los widgets son Server Components hermanos: React los renderiza en paralelo, así
que cada uno haciendo su propio `await` **no** genera waterfall. Dentro de un
widget, varias consultas independientes siguen yendo con `Promise.all`.

Cuando el mismo dato lo necesita más de un lugar —el saludo del home y el widget
de deuda consultan los dos `getDebtForUser`— la query se envuelve en `cache()` de
React y va una sola vez a la base por request. Es la misma técnica que ya usa
`getCurrentUser`.

**Sin `<Suspense>` por widget en v1.** Tentador para que uno lento no frene al
resto, pero un widget que termina devolviendo `null` mostraría el skeleton y lo
sacaría, y ese salto de layout es justo lo que no queremos con nuestros usuarios.
Ya existe `(app)/loading.tsx` para el primer pintado. Si más adelante un widget
puntual se pone lento, se le agrega Suspense solo a ese.

## Migración (sin cambio visual)

El refactor mueve lo que ya existe, sin tocar el diseño:

1. `DebtCard` + `UpToDateCard` → `widgets/deuda.tsx`.
2. La sección "Últimos movimientos" (con `RecentRow` y `STATUS_DISPLAY`) →
   `widgets/ultimos-movimientos.tsx`.
3. `InstallPrompt` → entrada en el registry, el componente queda como está.
4. `page.tsx` queda en saludo + grilla.

Recién después entra el widget nuevo de estado de pagos (ver
`docs/estado-de-pagos.md`), que ya no toca `page.tsx`.

## Skeleton

El home vive en el grupo de rutas `(app)/(home)/` para tener su propio
`loading.tsx`: el `loading.tsx` de `(app)` es el genérico que comparten otras
quince rutas, y un skeleton con forma de home no les sirve a ellas.

`WidgetCardSkeleton` está exportado desde `widget-card.tsx`, al lado del
componente real, y repite su estructura con barras: misma celda, mismo header,
mismo `p-5`. Cambiar uno sin el otro salta a la vista en el mismo archivo.

Las barras de texto usan `SkeletonLine`, que envuelve la barra en una caja del
alto de la línea real (`text-sm` → `h-5`, `text-2xl` → `h-8`, …). Así el
skeleton ocupa exactamente lo mismo que el contenido y la página no salta al
cargar.

## Fuera de alcance por ahora

- **Que el vecino elija qué widgets ve o en qué orden.** El orden lo fija el
  registry. Si algún día hace falta, la config de usuario se agrega sin cambiar
  el contrato.
- **Drag & drop.** Peor idea posible para nuestros usuarios.
- **Widgets de terceros / plugins.** No aplica.

## Impacto en archivos (estimado)

- `components/widgets/types.ts` (nuevo) — contrato.
- `components/widgets/widget-card.tsx` (nuevo) — shell.
- `components/widgets/registry.ts` (nuevo) — array ordenado + filtro por rol.
- `components/widgets/deuda.tsx`, `ultimos-movimientos.tsx`,
  `install-prompt.tsx` (nuevos) — migrados desde `page.tsx`.
- `components/install-prompt.tsx` — acepta `className` para poner su `col-span`.
- `lib/tones.ts` (nuevo) — paleta compartida con `page-header.tsx`.
- `lib/queries/expenses.ts` — `getDebtForUser` envuelta en `cache()`.
- `app/(app)/page.tsx` — queda en saludo + grilla.
</content>
