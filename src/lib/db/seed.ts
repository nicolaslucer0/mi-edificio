import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

async function main() {
  const { db } = await import("./index");
  const { users, consorcios, units, memberships, expenses, expenditures } =
    await import("./schema");
  const { and, eq } = await import("drizzle-orm");

  const NICOLAS_EMAIL = "nicolas.lucero1@gmail.com";
  const CONSORCIO_NAME = "Consorcio Aristóbulo del Valle 326/330";
  const CONSORCIO_ADDRESS = "Aristóbulo del Valle 326/330";
  const UNIT_LABEL = "4";

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, NICOLAS_EMAIL))
    .limit(1);
  let userId: string;
  if (existingUser.length > 0) {
    userId = existingUser[0].id;
    console.log("• User existe       →", userId);
  } else {
    const [created] = await db
      .insert(users)
      .values({ email: NICOLAS_EMAIL, name: "Nicolás Lucero" })
      .returning({ id: users.id });
    userId = created.id;
    console.log("✓ User creado       →", userId);
  }

  const existingConsorcio = await db
    .select()
    .from(consorcios)
    .where(eq(consorcios.name, CONSORCIO_NAME))
    .limit(1);
  let consorcioId: string;
  if (existingConsorcio.length > 0) {
    consorcioId = existingConsorcio[0].id;
    console.log("• Consorcio existe  →", consorcioId);
  } else {
    const [created] = await db
      .insert(consorcios)
      .values({
        name: CONSORCIO_NAME,
        type: "ph",
        address: CONSORCIO_ADDRESS,
      })
      .returning({ id: consorcios.id });
    consorcioId = created.id;
    console.log("✓ Consorcio creado  →", consorcioId);
  }

  const existingUnit = await db
    .select()
    .from(units)
    .where(and(eq(units.consorcioId, consorcioId), eq(units.label, UNIT_LABEL)))
    .limit(1);
  let unitId: string;
  if (existingUnit.length > 0) {
    unitId = existingUnit[0].id;
    console.log("• Unidad existe     →", unitId);
  } else {
    const [created] = await db
      .insert(units)
      .values({ consorcioId, label: UNIT_LABEL })
      .returning({ id: units.id });
    unitId = created.id;
    console.log("✓ Unidad creada     →", unitId);
  }

  const superAdmin = await db
    .select()
    .from(memberships)
    .where(
      and(eq(memberships.userId, userId), eq(memberships.role, "super_admin")),
    )
    .limit(1);
  if (superAdmin.length === 0) {
    await db
      .insert(memberships)
      .values({ userId, role: "super_admin" });
    console.log("✓ Membership super_admin creada");
  } else {
    console.log("• Membership super_admin existe");
  }

  const ownerMembership = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.role, "owner"),
        eq(memberships.unitId, unitId),
      ),
    )
    .limit(1);
  if (ownerMembership.length === 0) {
    await db.insert(memberships).values({
      userId,
      role: "owner",
      consorcioId,
      unitId,
    });
    console.log("✓ Membership owner unidad 4 creada");
  } else {
    console.log("• Membership owner unidad 4 existe");
  }

  const expenseSeeds = [
    { period: "2025-06", dueDate: "2025-07-10", amountCents: 7000000, status: "pagado" as const },
    { period: "2025-07", dueDate: "2025-08-10", amountCents: 7200000, status: "pagado" as const },
    { period: "2025-08", dueDate: "2025-09-10", amountCents: 7500000, status: "pagado" as const },
    { period: "2025-09", dueDate: "2025-10-10", amountCents: 7800000, status: "pagado" as const },
    { period: "2025-10", dueDate: "2025-11-10", amountCents: 8000000, status: "pagado" as const },
    { period: "2025-11", dueDate: "2025-12-10", amountCents: 8200000, status: "pagado" as const },
    { period: "2025-12", dueDate: "2026-01-10", amountCents: 8500000, status: "pagado" as const },
    { period: "2026-01", dueDate: "2026-02-10", amountCents: 9000000, status: "pagado" as const },
    { period: "2026-02", dueDate: "2026-03-10", amountCents: 9500000, status: "pagado" as const },
    { period: "2026-03", dueDate: "2026-04-10", amountCents: 9800000, status: "pagado" as const },
    { period: "2026-04", dueDate: "2026-05-10", amountCents: 10200000, status: "pendiente" as const },
    { period: "2026-05", dueDate: "2026-06-10", amountCents: 10500000, status: "pendiente" as const },
  ];

  for (const seed of expenseSeeds) {
    const existing = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(and(eq(expenses.unitId, unitId), eq(expenses.period, seed.period)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(expenses).values({
        unitId,
        period: seed.period,
        dueDate: new Date(seed.dueDate),
        amountCents: seed.amountCents,
        type: "ordinaria",
        status: seed.status,
        description: `Expensas ${seed.period}`,
      });
      console.log(`✓ Expensa ${seed.period} creada (${seed.status})`);
    } else {
      console.log(`• Expensa ${seed.period} existe`);
    }
  }

  const existingExpenditures = await db
    .select({ id: expenditures.id })
    .from(expenditures)
    .where(eq(expenditures.consorcioId, consorcioId))
    .limit(1);
  if (existingExpenditures.length === 0) {
    const expenditureSeeds = [
      {
        date: "2026-04-15",
        description: "Corte de pasto del frente y patio",
        amountCents: 5000000,
        category: "jardineria" as const,
        vendor: "Juan Pérez (jardinero)",
        notes: null,
      },
      {
        date: "2026-03-22",
        description: "Cambio de cerradura puerta principal",
        amountCents: 3500000,
        category: "mantenimiento" as const,
        vendor: "Cerrajería La Llave",
        notes: "Se reemplazó por una con tarjeta magnética.",
      },
      {
        date: "2026-02-10",
        description: "Limpieza y desinfección de tanques de agua",
        amountCents: 8000000,
        category: "limpieza" as const,
        vendor: "Aquatec SRL",
        notes: null,
      },
      {
        date: "2026-01-05",
        description: "Instalación de cámaras de seguridad",
        amountCents: 25000000,
        category: "seguridad" as const,
        vendor: "SecuriPlus",
        notes: "4 cámaras: entrada, patio, ascensor y terraza.",
      },
    ];
    for (const e of expenditureSeeds) {
      await db.insert(expenditures).values({
        consorcioId,
        date: new Date(e.date),
        description: e.description,
        amountCents: e.amountCents,
        category: e.category,
        vendor: e.vendor,
        notes: e.notes,
        createdByUserId: userId,
      });
      console.log(`✓ Gasto "${e.description}" creado`);
    }
  } else {
    console.log("• Gastos del consorcio ya existen, skip seed");
  }

  console.log("\n✅ Seed completo");
}

main().catch((err) => {
  console.error("❌ Seed falló:", err);
  process.exit(1);
});
