import { PushPrompt } from "@/components/push-prompt";

/**
 * Como el de instalar la app: el cliente decide si corresponde (si el push se
 * puede activar acá y todavía no está activo), así que dibuja su propia celda
 * de la grilla —y ninguna cuando está oculto— en vez de pasar por
 * `WidgetCard`.
 */
export function PushPromptWidget() {
  return <PushPrompt className="sm:col-span-2" />;
}
