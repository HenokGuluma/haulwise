import { PrismaClient } from "@prisma/client";
import { LBS_PER_QUINTAL } from "../src/lib/format";

const prisma = new PrismaClient();

async function main() {
  console.log(`Rescaling stored weight figures by 1 / LBS_PER_QUINTAL = ${LBS_PER_QUINTAL}...`);
  const loads = await prisma.$executeRawUnsafe(`UPDATE loads SET weight = ROUND(weight / ${LBS_PER_QUINTAL})::int`);
  console.log(`loads.weight rescaled on ${loads} rows.`);
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
