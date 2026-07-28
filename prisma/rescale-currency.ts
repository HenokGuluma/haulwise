// One-time migration: the platform switched its displayed currency from USD
// to ETB (see fmtMoney in src/lib/format.ts). Every dollar-scale figure
// already stored (from prisma/seed.ts and prisma/seed-demo.ts, run before
// the switch) needs to be multiplied by the same USD_TO_ETB_RATE so the
// numbers read as realistic birr amounts instead of a dollar figure with a
// relabeled currency tag. Run once per environment (local, then production)
// against DATABASE_URL. Safe to re-run only if you also revert first —
// running it twice would double-convert.
import { PrismaClient } from "@prisma/client";
import { USD_TO_ETB_RATE } from "../src/lib/format";

const prisma = new PrismaClient();

async function main() {
  console.log(`Rescaling stored currency figures by USD_TO_ETB_RATE = ${USD_TO_ETB_RATE}...`);

  const loads = await prisma.$executeRawUnsafe(
    `UPDATE loads SET rate = rate * ${USD_TO_ETB_RATE}, "driverPay" = "driverPay" * ${USD_TO_ETB_RATE}`
  );
  console.log(`loads.rate / loads.driverPay rescaled on ${loads} rows.`);

  const payments = await prisma.$executeRawUnsafe(`UPDATE payments SET amount = amount * ${USD_TO_ETB_RATE}`);
  console.log(`payments.amount rescaled on ${payments} rows.`);

  const maintenance = await prisma.$executeRawUnsafe(
    `UPDATE equipment_maintenance_records SET cost = cost * ${USD_TO_ETB_RATE} WHERE cost IS NOT NULL`
  );
  console.log(`equipment_maintenance_records.cost rescaled on ${maintenance} rows.`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
