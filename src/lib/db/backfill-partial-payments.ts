import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

/**
 * Backfill para pagos parciales. Correr UNA vez después de `db:push`:
 *   npx tsx src/lib/db/backfill-partial-payments.ts
 *
 * Las expensas ya `pagado` (previas a esta feature) tienen `paidCents = 0` por
 * el default de la columna nueva; sin esto se verían como "pagaste $0 de $X".
 * Es idempotente: solo toca las que están en 0. Los claims legacy sin monto se
 * interpretan como pago total en el código (claimValidatedCents), así que no
 * hace falta backfillearlos.
 */
async function main() {
  const { db } = await import("./index");
  const { expenses } = await import("./schema");
  const { and, eq, sql } = await import("drizzle-orm");

  const updated = await db
    .update(expenses)
    .set({ paidCents: sql`${expenses.amountCents}` })
    .where(and(eq(expenses.status, "pagado"), eq(expenses.paidCents, 0)))
    .returning({ id: expenses.id });

  console.log(`✓ Expensas pagadas backfilleadas → ${updated.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
