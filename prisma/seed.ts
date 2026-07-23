import { PrismaClient, LoadStatus, DriverStatus, EquipmentStatus, PayoutStatus, DocumentType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getStorageDriver } from "../src/lib/storage";

const prisma = new PrismaClient();

/** A tiny, real (if minimal) single-page PDF — enough for a browser to open and preview. */
function fakePdf(label: string): Buffer {
  const text = `Haulwise seed document — ${label}`;
  return Buffer.from(
    `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj
4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
5 0 obj<</Length ${text.length + 24}>>stream
BT /F1 12 Tf 12 60 Td (${text}) Tj ET
endstream
endobj
trailer<</Size 6/Root 1 0 R>>
%%EOF`,
    "latin1"
  );
}

function daysFromNow(n: number, hour = 8): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding Haulwise database...");

  // --- Users -----------------------------------------------------------
  const adminPassword = await bcrypt.hash("admin123", 10);
  const dispatcherPassword = await bcrypt.hash("dispatch123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@haulwise.local" },
    update: {},
    create: {
      name: "Alex Morgan",
      email: "admin@haulwise.local",
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: "dispatcher@haulwise.local" },
    update: {},
    create: {
      name: "Jamie Chen",
      email: "dispatcher@haulwise.local",
      passwordHash: dispatcherPassword,
      role: Role.DISPATCHER,
    },
  });

  // --- Customers ---------------------------------------------------------
  const customerData = [
    { companyName: "Meridian Foods Co.", contactName: "Alem Tesfaye", phone: "(555) 201-3344", email: "alem@meridianfoods.com" },
    { companyName: "Highline Building Supply", contactName: "Rosa Mendes", phone: "(555) 887-2210", email: "rosa@highlinesupply.com" },
    { companyName: "Cascade Retail Group", contactName: "Tom Okafor", phone: "(555) 340-9981", email: "tom.okafor@cascaderetail.com" },
    { companyName: "Blue Ridge Beverage", contactName: "Hana Girma", phone: "(555) 552-6690", email: "hana@blueridgebev.com" },
    { companyName: "Nordic Auto Parts", contactName: "Sven Larsen", phone: "(555) 776-1123", email: "sven@nordicparts.com" },
  ];
  const customers = [];
  for (const c of customerData) {
    customers.push(await prisma.customer.create({ data: c }));
  }

  // --- Drivers -------------------------------------------------------------
  const driverData = [
    { firstName: "Marcus", lastName: "Reed", phone: "(555) 410-2201", licenseNo: "DL-88213", licenseExpiration: daysFromNow(12), status: DriverStatus.AVAILABLE },
    { firstName: "Selam", lastName: "Bekele", phone: "(555) 622-9087", licenseNo: "DL-45021", licenseExpiration: daysFromNow(210), status: DriverStatus.ON_DUTY },
    { firstName: "Jorge", lastName: "Alvarez", phone: "(555) 331-4477", licenseNo: "DL-91820", licenseExpiration: daysFromNow(340), status: DriverStatus.ON_DUTY },
    { firstName: "Kwame", lastName: "Osei", phone: "(555) 118-2093", licenseNo: "DL-33410", licenseExpiration: daysFromNow(5), status: DriverStatus.AVAILABLE },
    { firstName: "Linda", lastName: "Park", phone: "(555) 764-2205", licenseNo: "DL-77102", licenseExpiration: daysFromNow(150), status: DriverStatus.OFF_DUTY },
    { firstName: "Dawit", lastName: "Alemu", phone: "(555) 209-8871", licenseNo: "DL-56230", licenseExpiration: daysFromNow(400), status: DriverStatus.AVAILABLE },
  ];
  const drivers = [];
  for (const d of driverData) {
    drivers.push(await prisma.driver.create({ data: d }));
  }

  // --- Equipment types -------------------------------------------------------
  // Also seeded by the equipment_types migration, but upserted here too so a
  // `prisma db push` + `seed` flow (no migration history) still has them.
  const equipmentTypeData = [
    { code: "V", label: "Dry Van", icon: "box", tone: "van" },
    { code: "R", label: "Reefer", icon: "snowflake", tone: "reefer" },
    { code: "F", label: "Flatbed", icon: "layers", tone: "flatbed" },
    { code: "PO", label: "Power Only", icon: "zap", tone: "power" },
  ];
  for (const t of equipmentTypeData) {
    await prisma.equipmentType.upsert({ where: { code: t.code }, update: {}, create: t });
  }

  // --- Equipment -----------------------------------------------------------
  const equipmentData = [
    { unitNumber: "TRL-104", typeCode: "V", status: EquipmentStatus.AVAILABLE, nextMaintenance: daysFromNow(45) },
    { unitNumber: "TRL-118", typeCode: "R", status: EquipmentStatus.IN_USE, nextMaintenance: daysFromNow(8) },
    { unitNumber: "TRL-092", typeCode: "F", status: EquipmentStatus.AVAILABLE, nextMaintenance: daysFromNow(120) },
    { unitNumber: "TRK-221", typeCode: "PO", status: EquipmentStatus.MAINTENANCE, nextMaintenance: daysFromNow(-2) },
    { unitNumber: "TRL-137", typeCode: "V", status: EquipmentStatus.IN_USE, nextMaintenance: daysFromNow(75) },
    { unitNumber: "TRL-146", typeCode: "R", status: EquipmentStatus.AVAILABLE, nextMaintenance: daysFromNow(3) },
  ];
  const equipment = [];
  for (const e of equipmentData) {
    equipment.push(await prisma.equipment.create({ data: e }));
  }

  // --- Loads -----------------------------------------------------------------
  const cities: [string, string][] = [
    ["Columbus, OH", "Nashville, TN"],
    ["Chicago, IL", "Kansas City, MO"],
    ["Atlanta, GA", "Charlotte, NC"],
    ["Dallas, TX", "Houston, TX"],
    ["Denver, CO", "Salt Lake City, UT"],
    ["Portland, OR", "Sacramento, CA"],
    ["Newark, NJ", "Richmond, VA"],
    ["Memphis, TN", "St. Louis, MO"],
    ["Phoenix, AZ", "Albuquerque, NM"],
    ["Indianapolis, IN", "Louisville, KY"],
  ];
  const commodities = ["Packaged Foods", "Steel Coils", "Building Materials", "Beverages", "Auto Parts", "Retail Goods", "Paper Products", "Machinery Parts"];
  const equipTypes = ["V", "R", "F", "PO"];

  type Plan = { status: LoadStatus; pu: number; del: number; assign: boolean; docs?: boolean; paid?: "yes" | "pending" };
  const plan: Plan[] = [
    { status: LoadStatus.DRAFT, pu: 4, del: 6, assign: false },
    { status: LoadStatus.DRAFT, pu: 6, del: 8, assign: false },
    { status: LoadStatus.ASSIGNED, pu: 2, del: 4, assign: true },
    { status: LoadStatus.ASSIGNED, pu: 3, del: 5, assign: true },
    { status: LoadStatus.DISPATCHED, pu: -0.2, del: 1.5, assign: true },
    { status: LoadStatus.DISPATCHED, pu: -0.1, del: 2, assign: true },
    { status: LoadStatus.IN_TRANSIT, pu: -1, del: 0.5, assign: true },
    { status: LoadStatus.IN_TRANSIT, pu: -0.6, del: 0.8, assign: true },
    { status: LoadStatus.IN_TRANSIT, pu: -1.4, del: 0.2, assign: true },
    { status: LoadStatus.DELIVERED, pu: -3, del: -1, assign: true, docs: true },
    { status: LoadStatus.DELIVERED, pu: -4, del: -2, assign: true, docs: true },
    { status: LoadStatus.BILLED, pu: -8, del: -6, assign: true, docs: true, paid: "yes" },
    { status: LoadStatus.BILLED, pu: -10, del: -8, assign: true, docs: true, paid: "yes" },
    { status: LoadStatus.BILLED, pu: -12, del: -10, assign: true, docs: true, paid: "pending" },
  ];

  for (let i = 0; i < plan.length; i++) {
    const p = plan[i];
    const [origin, destination] = cities[i % cities.length];
    const customer = customers[i % customers.length];
    const rate = 1450 + ((i * 137) % 1800);
    const weight = 12000 + ((i * 900) % 26000);
    const commodity = commodities[i % commodities.length];
    const equipmentTypeCode = equipTypes[i % equipTypes.length];

    let driverId: string | null = null;
    let equipmentId: string | null = null;
    if (p.assign) {
      driverId = drivers[i % drivers.length].id;
      const match = equipment.find((e) => e.typeCode === equipmentTypeCode);
      equipmentId = (match ?? equipment[i % equipment.length]).id;
    }

    const load = await prisma.load.create({
      data: {
        loadNumber: "HL-" + String(2400 + i + 1),
        customerId: customer.id,
        origin,
        destination,
        pickupTime: daysFromNow(p.pu, 8),
        deliveryTime: daysFromNow(p.del, 15),
        status: p.status,
        rate,
        weight,
        commodity,
        equipmentTypeCode,
        driverId,
        equipmentId,
        driverPay: Math.round(rate * 0.68),
        payoutStatus: p.paid === "yes" ? PayoutStatus.PAID : p.paid === "pending" ? PayoutStatus.PENDING : PayoutStatus.NOT_BILLED,
      },
    });

    if (p.docs) {
      const storage = getStorageDriver();
      for (const [type, fileName] of [
        [DocumentType.BOL, "bill-of-lading.pdf"],
        [DocumentType.POD, "proof-of-delivery.pdf"],
      ] as const) {
        const buffer = fakePdf(`${load.loadNumber} ${type}`);
        const storageKey = `loads/${load.id}/${type}/seed-${fileName}`;
        await storage.put(storageKey, buffer, "application/pdf");
        await prisma.document.create({
          data: {
            loadId: load.id,
            type,
            fileName,
            storageKey,
            fileSizeBytes: buffer.byteLength,
            mimeType: "application/pdf",
            uploadedById: admin.id,
          },
        });
      }
    }
  }

  // --- Integration readiness stub row (Phase 2 groundwork) ------------------
  await prisma.integration.upsert({
    where: { provider: "DAT" },
    update: {},
    create: { provider: "DAT", isEnabled: false },
  });

  console.log("Seed complete.");
  console.log("Login with: admin@haulwise.local / admin123  (Admin)");
  console.log("        or: dispatcher@haulwise.local / dispatch123  (Dispatcher)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
