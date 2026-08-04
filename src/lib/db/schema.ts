import {
  pgTable,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  primaryKey,
  uuid,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

export const consorcioTypeEnum = pgEnum("consorcio_type", [
  "edificio",
  "ph",
  "barrio_cerrado",
]);

export const roleEnum = pgEnum("role", [
  "super_admin",
  "admin",
  "owner",
  "tenant",
]);

export const expenseTypeEnum = pgEnum("expense_type", [
  "ordinaria",
  "extraordinaria",
]);

export const expenseStatusEnum = pgEnum("expense_status", [
  "pendiente",
  "en_validacion",
  "parcial",
  "pagado",
  "rechazado",
]);

export const claimResolutionEnum = pgEnum("claim_resolution", [
  "pending",
  "approved",
  "rejected",
]);

export const creditReasonEnum = pgEnum("credit_reason", [
  "overpayment",
  "deposit",
  "application",
  "adjustment",
]);

export const expenditureCategoryEnum = pgEnum("expenditure_category", [
  "limpieza",
  "mantenimiento",
  "jardineria",
  "seguridad",
  "servicios",
  "obras",
  "administracion",
  "otros",
]);

// Cuánto del estado de pagos del consorcio ven los vecinos entre ellos.
// Ver docs/estado-de-pagos.md.
export const debtVisibilityEnum = pgEnum("debt_visibility", [
  "off",
  "resumen",
  "por_unidad",
]);

export const notificationTypeEnum = pgEnum(
  "notification_type",
  NOTIFICATION_TYPES,
);

export type NotificationPrefs = {
  newExpense: boolean;
  dueDateReminder: boolean;
  paymentConfirmed: boolean;
  paymentRejected: boolean;
  newClaimToValidate: boolean;
};

export const users = pgTable("user", {
  id: text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text(),
  email: text().unique(),
  emailVerified: timestamp({ mode: "date" }),
  image: text(),
  phone: text(),
  notificationPrefs: jsonb().$type<NotificationPrefs>(),
  createdAt: timestamp().defaultNow().notNull(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text().$type<AdapterAccountType>().notNull(),
    provider: text().notNull(),
    providerAccountId: text().notNull(),
    refresh_token: text(),
    access_token: text(),
    expires_at: integer(),
    token_type: text(),
    scope: text(),
    id_token: text(),
    session_state: text(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text().primaryKey(),
  userId: text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp({ mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text().notNull(),
    token: text().notNull(),
    expires: timestamp({ mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const consorcios = pgTable("consorcio", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  type: consorcioTypeEnum().notNull(),
  address: text(),
  paymentAlias: text(),
  paymentCbu: text(),
  paymentHolderName: text(),
  openingBalanceCents: integer().notNull().default(0),
  openingBalanceDate: timestamp({ mode: "date" }),
  // Estado de pagos visible entre vecinos: off = nadie lo ve; resumen = solo el
  // agregado ("14 de 20 al día"); por_unidad = listado con unidad y monto, sin
  // nombres. Días de gracia = cuánto puede demorarse un pago antes de figurar.
  debtVisibility: debtVisibilityEnum().notNull().default("off"),
  debtGraceDays: integer().notNull().default(10),
  debtOnHome: boolean().notNull().default(false),
  createdAt: timestamp().defaultNow().notNull(),
});

export const units = pgTable(
  "unit",
  {
    id: uuid().primaryKey().defaultRandom(),
    consorcioId: uuid()
      .notNull()
      .references(() => consorcios.id, { onDelete: "cascade" }),
    label: text().notNull(),
    floor: text(),
    // Coeficiente/porcentaje de la unidad para prorratear expensas (ej. 10.30).
    // Null = sin cargar → el reparto de un total va en partes iguales.
    coefficient: numeric({ precision: 5, scale: 2 }),
    // Saldo a favor de la unidad (cacheado). Se recalcula desde el ledger
    // unitCredits tras cada movimiento (ver src/lib/credits.ts).
    creditCents: integer().notNull().default(0),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index("unit_consorcio_idx").on(t.consorcioId)],
);

export const memberships = pgTable(
  "membership",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    consorcioId: uuid().references(() => consorcios.id, {
      onDelete: "cascade",
    }),
    unitId: uuid().references(() => units.id, { onDelete: "cascade" }),
    role: roleEnum().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [
    index("membership_user_idx").on(t.userId),
    index("membership_consorcio_idx").on(t.consorcioId),
    index("membership_unit_idx").on(t.unitId),
  ],
);

export const expenses = pgTable(
  "expense",
  {
    id: uuid().primaryKey().defaultRandom(),
    unitId: uuid()
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    period: text().notNull(),
    dueDate: timestamp({ mode: "date" }).notNull(),
    amountCents: integer().notNull(),
    // Total pagado y validado. Se recalcula como la suma de los claims
    // aprobados en cada aprobación/rechazo (ver src/lib/payments.ts).
    paidCents: integer().notNull().default(0),
    type: expenseTypeEnum().notNull(),
    status: expenseStatusEnum().notNull().default("pendiente"),
    description: text(),
    // Cuándo se mandó el aviso de "vence mañana". El cron corre todos los días
    // y esta marca es lo que evita que reintentos o corridas manuales avisen
    // dos veces (ver api/cron/due-reminders).
    dueReminderSentAt: timestamp({ mode: "date" }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [
    index("expense_unit_idx").on(t.unitId),
    index("expense_status_idx").on(t.status),
  ],
);

export const expenditures = pgTable(
  "expenditure",
  {
    id: uuid().primaryKey().defaultRandom(),
    consorcioId: uuid()
      .notNull()
      .references(() => consorcios.id, { onDelete: "cascade" }),
    date: timestamp({ mode: "date" }).notNull(),
    description: text().notNull(),
    amountCents: integer().notNull(),
    category: expenditureCategoryEnum().notNull(),
    vendor: text(),
    receiptUrl: text(),
    notes: text(),
    createdByUserId: text()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [
    index("expenditure_consorcio_idx").on(t.consorcioId),
    index("expenditure_date_idx").on(t.date),
  ],
);

export const paymentClaims = pgTable(
  "payment_claim",
  {
    id: uuid().primaryKey().defaultRandom(),
    expenseId: uuid()
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    claimedByUserId: text()
      .notNull()
      .references(() => users.id),
    claimedAt: timestamp().defaultNow().notNull(),
    // Monto que informa el vecino en este pago. Null en claims legacy
    // (previos a pagos parciales) → se interpreta como la expensa completa.
    amountCents: integer(),
    // Monto que valida el admin al aprobar (puede corregir el informado).
    confirmedAmountCents: integer(),
    receiptUrl: text(),
    note: text(),
    resolution: claimResolutionEnum().notNull().default("pending"),
    resolvedByUserId: text().references(() => users.id),
    resolvedAt: timestamp(),
    rejectionReason: text(),
  },
  (t) => [
    index("claim_expense_idx").on(t.expenseId),
    index("claim_resolution_idx").on(t.resolution),
  ],
);

// Ledger de saldo a favor por unidad. Con signo: + ingreso (sobrepago o
// depósito validado), − aplicación a una expensa. Balance = sum(amountCents).
export const unitCredits = pgTable(
  "unit_credit",
  {
    id: uuid().primaryKey().defaultRandom(),
    unitId: uuid()
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    amountCents: integer().notNull(),
    reason: creditReasonEnum().notNull(),
    relatedExpenseId: uuid().references(() => expenses.id, {
      onDelete: "set null",
    }),
    relatedClaimId: uuid().references(() => paymentClaims.id, {
      onDelete: "set null",
    }),
    // Null cuando lo genera el sistema (aplicación automática).
    createdByUserId: text().references(() => users.id),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index("unit_credit_unit_idx").on(t.unitId)],
);

// Adelantos de saldo informados por el vecino, a validar por el admin.
export const creditDeposits = pgTable(
  "credit_deposit",
  {
    id: uuid().primaryKey().defaultRandom(),
    unitId: uuid()
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    requestedByUserId: text()
      .notNull()
      .references(() => users.id),
    amountCents: integer().notNull(),
    receiptUrl: text(),
    note: text(),
    status: claimResolutionEnum().notNull().default("pending"),
    resolvedByUserId: text().references(() => users.id),
    resolvedAt: timestamp(),
    rejectionReason: text(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [
    index("credit_deposit_unit_idx").on(t.unitId),
    index("credit_deposit_status_idx").on(t.status),
  ],
);

export const notifications = pgTable(
  "notification",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum().notNull(),
    title: text().notNull(),
    body: text(),
    href: text(),
    readAt: timestamp({ mode: "date" }),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index("notification_user_idx").on(t.userId)],
);

// Avisos que manda el administrador y que no son de plata: un corte de agua,
// una asamblea, una encomienda para el 3° B. Ver
// docs/comunicados-y-consultas.md.
export const announcements = pgTable(
  "announcement",
  {
    id: uuid().primaryKey().defaultRandom(),
    consorcioId: uuid()
      .notNull()
      .references(() => consorcios.id, { onDelete: "cascade" }),
    // Null = va a todo el consorcio.
    unitId: uuid().references(() => units.id, { onDelete: "set null" }),
    title: text().notNull(),
    body: text().notNull(),
    // Si además salió por mail. Lo decide el admin al mandarlo.
    emailSent: boolean().notNull().default(false),
    createdByUserId: text()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index("announcement_consorcio_idx").on(t.consorcioId, t.createdAt)],
);

// Un dispositivo suscripto a las notificaciones push. El mismo vecino puede
// tener varios (el teléfono y la computadora), y cada uno se da de alta y de
// baja por separado. Ver docs/notificaciones-push.md.
export const pushSubscriptions = pgTable(
  "push_subscription",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // La URL que da el navegador: identifica al dispositivo.
    endpoint: text().notNull().unique(),
    // Claves con las que el navegador descifra el mensaje.
    p256dh: text().notNull(),
    auth: text().notNull(),
    // Para poder listar "Chrome en Android" en la pantalla de Cuenta.
    userAgent: text(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index("push_subscription_user_idx").on(t.userId)],
);

// Espacios comunes reservables del consorcio (pileta, terraza, SUM).
export const amenities = pgTable(
  "amenity",
  {
    id: uuid().primaryKey().defaultRandom(),
    consorcioId: uuid()
      .notNull()
      .references(() => consorcios.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text(),
    reservable: boolean().notNull().default(true),
    // Franja horaria disponible (horas enteras; closeHour es fin exclusivo).
    openHour: integer().notNull().default(8),
    closeHour: integer().notNull().default(23),
    maxHours: integer().notNull().default(4),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index("amenity_consorcio_idx").on(t.consorcioId)],
);

// Reservas por rango de horas. `day` como texto "YYYY-MM-DD" + horas enteras
// para evitar zona horaria; el solape se chequea sobre (amenityId, day).
export const amenityReservations = pgTable(
  "amenity_reservation",
  {
    id: uuid().primaryKey().defaultRandom(),
    amenityId: uuid()
      .notNull()
      .references(() => amenities.id, { onDelete: "cascade" }),
    reservedByUserId: text()
      .notNull()
      .references(() => users.id),
    unitId: uuid().references(() => units.id, { onDelete: "set null" }),
    day: text().notNull(),
    startHour: integer().notNull(),
    endHour: integer().notNull(),
    createdAt: timestamp().defaultNow().notNull(),
  },
  (t) => [index("amenity_reservation_amenity_day_idx").on(t.amenityId, t.day)],
);
