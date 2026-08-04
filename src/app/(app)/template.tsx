import { ViewTransition } from "react";

/**
 * Cómo se mueve el contenido al navegar. Las clases las interpreta
 * `globals.css` (`::view-transition-old(.content)` y compañía); acá solo se
 * decide cuál va en cada caso.
 *
 * La dirección la pone cada link con `transitionTypes` (ver `navDirection` en
 * `nav-items`): un ítem de la barra que está a la derecha del actual entra
 * desde la derecha, el botón de volver entra desde la izquierda. Un link sin
 * tipo cae en `default` y hace el mismo levantar corto de siempre.
 */
const CONTENT = {
  "nav-forward": "content forward",
  "nav-back": "content back",
  default: "content",
};

/**
 * `update` es el cambio de skeleton a contenido real: es el mismo contenedor
 * que cambia por dentro cuando Suspense resuelve. Va sin dirección a propósito
 * —un fundido corto— porque ya hubo un movimiento al entrar y dos seguidos para
 * una sola navegación se sienten como que la pantalla no se queda quieta.
 *
 * `default: "none"` es para todo lo demás: si cambia algo del shell (se marca
 * una notificación como leída, se abre un menú), el contenido no tiene por qué
 * fundirse entero.
 */
export default function AppTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ViewTransition
      enter={CONTENT}
      exit={CONTENT}
      update="content"
      default="none"
    >
      <div className="flex flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}
