import { InstallPrompt } from "@/components/install-prompt";

/**
 * Única excepción al shell: el prompt decide en el cliente si corresponde
 * mostrarse (plataforma, app ya instalada, descartado hace poco), así que
 * dibuja su propia celda de la grilla —y ninguna cuando está oculto— en vez de
 * pasar por `WidgetCard`.
 */
export function InstallPromptWidget() {
  return <InstallPrompt className="sm:col-span-2" />;
}
