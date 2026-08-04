/**
 * Los avisos que la app puede mandar. **Fuente única.**
 *
 * De acá salen el enum de la base (`notificationTypeEnum`), el tipo que usa el
 * envío y el que usa la fila de la campanita. Antes la lista estaba escrita
 * dos veces y agregar un aviso rompía el type check en el tercer archivo, de a
 * uno; ahora se agrega en un lugar y el compilador pide el ícono que falta.
 *
 * Es un módulo sin dependencias a propósito: lo importa un componente de
 * cliente y no puede arrastrar drizzle al bundle.
 */
export const NOTIFICATION_TYPES = [
  "claim_to_validate",
  "payment_confirmed",
  "payment_rejected",
  "new_expense",
  "due_reminder",
  "announcement",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
