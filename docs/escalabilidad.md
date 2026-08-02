# Escalabilidad y costos

Estado: **análisis**. Fecha: 2026-08-02.

Escenario que se analiza: **300 consorcios, ~9.000 unidades, ~15.000 usuarios**.

## La escala es más chica de lo que suena

| Qué | Volumen |
|---|---|
| Unidades | 9.000 |
| Expensas | 9.000/mes ≈ 110.000 filas/año |
| Gastos | ~15.000/mes |
| Base completa a 5 años | **menos de 1 GB** |

Es una base que entra entera en la RAM de la instancia más chica que se pueda
alquilar. Y el tráfico tiene una forma particular: **está muerto 28 días al mes
y explota el día que se publican las expensas**. No es carga sostenida, son
picos previsibles.

> **La conclusión incómoda:** a esta escala no hay un problema de
> escalabilidad. Hay un problema de costo por request y dos o tres bugs que
> aparecen recién con volumen. Cambiar de lenguaje no mueve la aguja: el
> trabajo de esta app es esperar a la base de datos, no calcular.

Lo que **ya está bien** y es lo caro de arreglar después: el modelo de datos
está naturalmente particionado por consorcio. Ninguna query es O(todos los
usuarios). Si algún día hubiera que partir la base, se parte por consorcio sin
tocar el dominio.

## Lo que se rompe primero

### 1. La tormenta de queries por request

Antes de que una página empiece a hacer lo suyo, cada navegación paga:

- La sesión: Auth.js usa `DrizzleAdapter` con tabla `sessions`, o sea **una
  query a Postgres por request**.
- `requireUser()` y sus membresías.
- Las cinco del layout: consorcios disponibles, consorcio actual,
  notificaciones recientes, no leídas y `hasReservableAmenities`.

Son unas siete idas y vueltas antes de renderizar. Con Neon por HTTP cada una
cuesta latencia real. Ya se nota hoy con un consorcio; con 15.000 usuarios es
la factura entera.

### 2. El fan-out sincrónico al publicar expensas

En `lib/actions/admin.ts`, al crear las expensas de un período corren dos loops
**secuenciales**: uno aplica el saldo a favor unidad por unidad
(`applyCreditToUnit`) y otro notifica. Para 30 unidades son ~30 viajes en
serie; para una torre de 200, o publicando varios consorcios seguidos, **se va
del timeout de la función**. Con push sumado, adentro hay además un envío HTTP
por dispositivo.

Es el bug de escala más concreto del código.

### 3. Nada está cacheado

Todas las páginas son dinámicas. El balance de un consorcio se renderiza
idéntico mil veces por día y se paga mil veces.

## Los seis cambios, en orden de impacto

1. **Sesión a JWT.** Auth.js soporta adapter —que hace falta para el magic
   link— con sesiones JWT. Elimina una query por request en toda la app, sin
   contrapartida.
2. **Cachear los datos del layout** con tags por usuario y consorcio,
   invalidando en la escritura. El nombre del consorcio y el flag de amenities
   no cambian nunca y hoy se consultan en cada click.
3. **Sacar el fan-out del request.** Una tabla `jobs` y un cron que la drena.
   No hace falta SQS ni Redis: Postgres como cola aguanta muchísimo más que
   esto, y ya está pago.
4. **Cachear las páginas de lectura** (`/gastos`, `/balance`, reportes) con
   `revalidateTag('consorcio-<id>')` al escribir. Miles de renders pasan a uno.
5. **Agregar en SQL, no en JS.** Varias queries traen los registros de doce
   meses para sumarlos en memoria (`getMonthlyFinancials`, `buildDebtBoard`). A
   esta escala da igual porque todo está scopeado por consorcio, pero es el
   hábito que después duele.
6. **Índices compuestos** en `(unitId, period)` y `(consorcioId, date)`, que
   son los pares por los que realmente se filtra.

Ninguno es una reescritura: es trabajo sobre lo que ya existe.

## Infraestructura

| Opción | Costo aprox. | A cambio de |
|---|---|---|
| Vercel Pro + Neon | ~$45/mes | Cero operaciones, previews, deploy en push |
| Vercel Hobby + Neon free | $0 | Límites reales; Hobby no habilita uso comercial |
| **VPS con Postgres al lado** | **~€5/mes** | Ser el sysadmin: backups, updates, TLS |

Un VPS chico (2 vCPU, 4 GB) corre la app y Postgres en Docker, con un CDN
adelante, y sobra hardware para diez veces esta escala. **Postgres en la misma
máquina elimina la latencia de red por query**, que es justamente el cuello de
botella: resuelve el problema 1 casi solo.

El costo real de esa opción no es la plata, es que un domingo a la noche se
llena el disco y el responsable sos vos. Si el proyecto factura, los $45
compran tranquilidad barata; si es un side project, el VPS es diez veces más
barato.

**Sobre Neon:** suspende la compute sin tráfico, lo cual encaja perfecto con
picos mensuales... salvo que el primer request después del silencio paga el
arranque en frío. Con 28 días tranquilos al mes, se comen cold starts todo el
tiempo.

## Lo que no haría

- **Reescribir el lenguaje.** El trabajo es I/O, no CPU. Go o Rust ahorran
  milisegundos de cómputo mientras se siguen esperando 20 ms por viaje a la
  base. Meses de trabajo para ahorrar centavos.
- **Microservicios, Kubernetes, Redis.** Infraestructura para problemas que a
  15.000 usuarios no existen. Cada pieza es una cuenta más y una cosa más que
  se rompe.
- **Una capa de API separada.** Es lo que obligaría a hacer un cliente Flutter:
  duplicar cada feature sin ganar nada. Ver la discusión en
  [notificaciones push](./notificaciones-push.md).
