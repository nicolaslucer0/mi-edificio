import {
  pgTable,
  text,
  timestamp,
  integer,
  primaryKey,
  uuid,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

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

export const notificationTypeEnum = pgEnum("notification_type", [
  "claim_to_validate",
  "payment_confirmed",
  "payment_rejected",
  "new_expense",
]);

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
