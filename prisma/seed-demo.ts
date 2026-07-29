// Generates a large, realistic 3-year demo dataset and tags every row
// isDemo: true so it can be shown/hidden per-user via Settings > "Show
// demo data" (see src/lib/demo-scope.ts). Safe to re-run: upserts the
// demo user and equipment types, but re-running will add a second batch
// of customers/drivers/equipment/loads (no dedup) — only run once per
// environment, or clear demo rows first (see the cleanup note at the
// bottom of this file).
//
// Usage: STORAGE_DRIVER=vercel-blob BLOB_READ_WRITE_TOKEN=... DATABASE_URL=... \
//        npx tsx prisma/seed-demo.ts
import { randomUUID } from "node:crypto";
import {
  PrismaClient,
  LoadStatus,
  DriverStatus,
  EquipmentStatus,
  PayoutStatus,
  DocumentType,
  CustomerStatus,
  Role,
  type Prisma,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import { getStorageDriver } from "../src/lib/storage";
import { USD_TO_ETB_RATE } from "../src/lib/format";

const prisma = new PrismaClient();

const DEMO_USER_EMAIL = "tecknoking24@gmail.com";
const DEMO_USER_PASSWORD = "tdashuluqa";
const DEMO_USER_FIRST_NAME = "Jordan";
const DEMO_USER_LAST_NAME = "Blake";

// ---------------------------------------------------------------------------
// Deterministic RNG so re-running against a fresh DB produces the same shape
// of data (not required, just convenient for debugging).
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260722);
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function pickWeighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, weight] of entries) {
    r -= weight;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function chance(p: number): boolean {
  return rand() < p;
}

// ---------------------------------------------------------------------------
// Name / company pools
// ---------------------------------------------------------------------------
const FIRST_NAMES = [
  "Alem", "Selam", "Jorge", "Kwame", "Linda", "Dawit", "Maria", "Yohannes", "Fatima", "Carlos",
  "Aisha", "Miguel", "Hana", "Samuel", "Grace", "Tariq", "Elena", "Marcus", "Rosa", "Tom",
  "Sven", "Nadia", "Ivan", "Priya", "Chen", "Wei", "Amara", "Diego", "Sofia", "Lucas",
  "Nia", "Omar", "Zara", "Felix", "Ingrid", "Kofi", "Mei", "Raj", "Isabella", "Andres",
  "Yuki", "Noor", "Boris", "Camila", "Dmitri", "Layla", "Pedro", "Anika", "Jamal", "Katya",
];
const LAST_NAMES = [
  "Tesfaye", "Bekele", "Alvarez", "Osei", "Park", "Alemu", "Rodriguez", "Girma", "Mendes", "Larsen",
  "Hassan", "Reyes", "Girmay", "Reed", "Nguyen", "Okafor", "Petrov", "Kapoor", "Zhang", "Li",
  "Diallo", "Silva", "Costa", "Novak", "Haile", "Abera", "Fernandez", "Kimura", "Volkov", "Singh",
  "Patel", "Kimani", "Mwangi", "Santos", "Rossi", "Muller", "Andersen", "Johansson", "Kovac", "Ibrahim",
  "Farouk", "Aziz", "Duarte", "Moreno", "Kaur", "Chowdhury", "Yamamoto", "Choi", "Wallace", "Brennan",
];
function fullName(): { first: string; last: string } {
  return { first: pick(FIRST_NAMES), last: pick(LAST_NAMES) };
}

const COMPANY_PREFIXES = [
  "Meridian", "Highline", "Cascade", "Blue Ridge", "Nordic", "Summit", "Ironclad", "Pioneer", "Anchor", "Harbor",
  "Crestview", "Lakeside", "Union", "Liberty", "Vanguard", "Redwood", "Prairie", "Coastal", "Timber", "Granite",
  "Silver Peak", "Golden Gate", "Riverside", "Northgate", "Southport", "Westbrook", "Eastfield", "Continental", "Heartland", "Frontier",
  "Bluewater", "Stonegate", "Copperline", "Maple Grove", "Ridgeline",
];
const COMPANY_SUFFIXES = [
  "Foods Co.", "Building Supply", "Retail Group", "Beverage Co.", "Auto Parts", "Logistics", "Manufacturing", "Distribution",
  "Freight Partners", "Materials Inc.", "Industries", "Wholesale Co.", "Produce Co.", "Textiles", "Electronics",
  "Chemical Corp.", "Packaging", "Steel Works", "Agri Co.", "Trading Co.",
];

const CITY_PAIRS: [string, string, "short" | "medium" | "long"][] = [
  ["Columbus, OH", "Nashville, TN", "medium"],
  ["Chicago, IL", "Kansas City, MO", "medium"],
  ["Atlanta, GA", "Charlotte, NC", "short"],
  ["Dallas, TX", "Houston, TX", "short"],
  ["Denver, CO", "Salt Lake City, UT", "long"],
  ["Portland, OR", "Sacramento, CA", "long"],
  ["Newark, NJ", "Richmond, VA", "medium"],
  ["Memphis, TN", "St. Louis, MO", "short"],
  ["Phoenix, AZ", "Albuquerque, NM", "medium"],
  ["Indianapolis, IN", "Louisville, KY", "short"],
  ["Los Angeles, CA", "Las Vegas, NV", "short"],
  ["Seattle, WA", "Boise, ID", "medium"],
  ["Miami, FL", "Orlando, FL", "short"],
  ["Detroit, MI", "Cleveland, OH", "short"],
  ["Minneapolis, MN", "Milwaukee, WI", "short"],
  ["San Antonio, TX", "Oklahoma City, OK", "medium"],
  ["Charlotte, NC", "Richmond, VA", "medium"],
  ["Baltimore, MD", "Pittsburgh, PA", "medium"],
  ["Boston, MA", "Albany, NY", "medium"],
  ["Tampa, FL", "Atlanta, GA", "medium"],
  ["El Paso, TX", "Tucson, AZ", "medium"],
  ["Omaha, NE", "Des Moines, IA", "short"],
  ["Raleigh, NC", "Columbia, SC", "short"],
  ["Fresno, CA", "Reno, NV", "medium"],
  ["Tulsa, OK", "Little Rock, AR", "short"],
  ["Jacksonville, FL", "Savannah, GA", "short"],
  ["Spokane, WA", "Missoula, MT", "medium"],
  ["Buffalo, NY", "Syracuse, NY", "short"],
  ["Birmingham, AL", "Jackson, MS", "short"],
  ["Reno, NV", "Sacramento, CA", "short"],
  ["Louisville, KY", "Cincinnati, OH", "short"],
  ["Amarillo, TX", "Albuquerque, NM", "medium"],
  ["Green Bay, WI", "Chicago, IL", "short"],
  ["Harrisburg, PA", "Newark, NJ", "short"],
  ["Boise, ID", "Portland, OR", "medium"],
];
const TRANSIT_HOURS: Record<"short" | "medium" | "long", [number, number]> = {
  short: [3, 8],
  medium: [10, 20],
  long: [26, 48],
};

const COMMODITIES = [
  "Packaged Foods", "Steel Coils", "Building Materials", "Beverages", "Auto Parts", "Retail Goods",
  "Paper Products", "Machinery Parts", "Frozen Foods", "Furniture", "Consumer Electronics", "Textiles",
  "Palletized Freight", "Produce", "Industrial Chemicals (Non-Haz)",
];

const CONTACT_TITLES = ["Ops Manager", "AP Contact", "Traffic Coordinator", "Warehouse Supervisor", "Procurement Lead"];
const ENDORSEMENT_POOL = ["Hazmat", "Tanker", "Doubles/Triples", "TWIC"];

const MAINTENANCE_DESCRIPTIONS = [
  "Oil and filter change",
  "Brake inspection and pad replacement",
  "Tire rotation and alignment",
  "DOT annual inspection",
  "Transmission fluid service",
  "Reefer unit PM service",
  "Coolant system flush",
  "Electrical system diagnostic",
  "Suspension repair",
  "Trailer light and wiring repair",
];

const DISPATCH_NOTES = [
  "Customer requested early pickup — confirmed with driver.",
  "POD received, forwarded to billing.",
  "Detention reported at pickup — following up with customer for accessorial.",
  "Driver reported minor delay due to weather; customer notified.",
  "Rate confirmed verbally, written confirmation to follow.",
  "Reweigh required at destination — coordinating with receiver.",
  "Customer added a second pickup stop; rate adjusted accordingly.",
  "Load tendered via phone, entered manually.",
  "Appointment time changed by receiver — driver updated.",
  "Awaiting signed rate confirmation before dispatch.",
];

// ---------------------------------------------------------------------------
// Equipment types — the 4 seeded defaults plus two new ones for variety.
// ---------------------------------------------------------------------------
const EQUIPMENT_TYPE_DEFS: { code: string; label: string; icon: string; tone: string; weight: number }[] = [
  { code: "V", label: "Dry Van", icon: "box", tone: "van", weight: 35 },
  { code: "R", label: "Reefer", icon: "snowflake", tone: "reefer", weight: 20 },
  { code: "F", label: "Flatbed", icon: "layers", tone: "flatbed", weight: 20 },
  { code: "PO", label: "Power Only", icon: "zap", tone: "power", weight: 10 },
  { code: "LB", label: "Lowboy", icon: "truck", tone: "slate", weight: 8 },
  { code: "TK", label: "Tanker", icon: "warehouse", tone: "danger", weight: 7 },
];
// How many units of each type to add to the fleet (~28 units total).
const EQUIPMENT_COUNTS: Record<string, number> = { V: 9, R: 6, F: 5, PO: 4, LB: 2, TK: 2 };

const CUSTOMER_COUNT = 45;
const DRIVER_COUNT = 34;
const HISTORICAL_LOAD_COUNT = 640;
const ACTIVE_LOAD_COUNT = 85;
const YEARS_OF_HISTORY = 3;

function daysFromNow(days: number, hour = 8, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  console.log("Seeding Edget demo dataset (3 years of mock operations)...");
  const startedAt = Date.now();

  // --- Demo user -----------------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: { showMockData: true },
    create: {
      firstName: DEMO_USER_FIRST_NAME,
      lastName: DEMO_USER_LAST_NAME,
      email: DEMO_USER_EMAIL,
      passwordHash,
      role: Role.ADMIN,
      showMockData: true,
    },
  });
  console.log(`Demo user ready: ${demoUser.email} (showMockData: true)`);

  // --- Equipment types -------------------------------------------------------
  for (const t of EQUIPMENT_TYPE_DEFS) {
    await prisma.equipmentType.upsert({
      where: { code: t.code },
      update: {},
      create: { code: t.code, label: t.label, icon: t.icon, tone: t.tone },
    });
  }
  console.log(`Equipment types ready: ${EQUIPMENT_TYPE_DEFS.map((t) => t.code).join(", ")}`);

  // --- Customers ---------------------------------------------------------
  const usedCompanyNames = new Set<string>();
  function uniqueCompanyName(): string {
    let name = "";
    do {
      name = `${pick(COMPANY_PREFIXES)} ${pick(COMPANY_SUFFIXES)}`;
    } while (usedCompanyNames.has(name));
    usedCompanyNames.add(name);
    return name;
  }

  type CustomerRow = Prisma.CustomerCreateManyInput & { id: string };
  const customers: CustomerRow[] = [];
  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const { first, last } = fullName();
    const companyName = uniqueCompanyName();
    const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const status = pickWeighted<CustomerStatus>([
      [CustomerStatus.ACTIVE, 78],
      [CustomerStatus.PROSPECT, 12],
      [CustomerStatus.INACTIVE, 10],
    ]);
    customers.push({
      id: randomUUID(),
      companyName,
      contactName: `${first} ${last}`,
      phone: `(${randInt(200, 989)}) ${randInt(200, 999)}-${randInt(1000, 9999)}`,
      email: `${first.toLowerCase()}@${slug}.com`,
      status,
      paymentTerms: pick(["Net 15", "Net 30", "Net 45", "Net 30", "Net 30"]),
      notes: chance(0.2) ? "Long-standing account — prioritize on-time service." : null,
      isDemo: true,
    });
  }
  await prisma.customer.createMany({ data: customers });
  console.log(`Created ${customers.length} demo customers.`);

  const contactRows: Prisma.CustomerContactCreateManyInput[] = [];
  for (const c of customers) {
    if (!chance(0.5)) continue;
    const n = randInt(1, 2);
    for (let i = 0; i < n; i++) {
      const { first, last } = fullName();
      contactRows.push({
        id: randomUUID(),
        customerId: c.id,
        name: `${first} ${last}`,
        title: pick(CONTACT_TITLES),
        phone: `(${randInt(200, 989)}) ${randInt(200, 999)}-${randInt(1000, 9999)}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        isPrimary: false,
      });
    }
  }
  if (contactRows.length) await prisma.customerContact.createMany({ data: contactRows });
  console.log(`Created ${contactRows.length} extra customer contacts.`);

  // --- Drivers -------------------------------------------------------------
  type DriverRow = Prisma.DriverCreateManyInput & { id: string };
  const drivers: DriverRow[] = [];
  for (let i = 0; i < DRIVER_COUNT; i++) {
    const { first, last } = fullName();
    // Most licenses are comfortably valid; a handful expire soon or already
    // expired, so the dashboard's "Needs attention" panel has real content.
    const licenseExpiration = i < 2 ? daysFromNow(-randInt(1, 10)) : i < 6 ? daysFromNow(-randInt(-21, -1)) : daysFromNow(-randInt(60, 620));
    const endorsementCount = chance(0.35) ? randInt(1, 2) : 0;
    const endorsements = Array.from(new Set(Array.from({ length: endorsementCount }, () => pick(ENDORSEMENT_POOL))));
    drivers.push({
      id: randomUUID(),
      firstName: first,
      lastName: last,
      phone: `(${randInt(200, 989)}) ${randInt(200, 999)}-${randInt(1000, 9999)}`,
      licenseNo: `DL-${randInt(10000, 99999)}`,
      licenseExpiration,
      medicalCertExpiration: chance(0.85) ? daysFromNow(-randInt(30, 500)) : null,
      endorsements,
      status: pickWeighted<DriverStatus>([
        [DriverStatus.AVAILABLE, 50],
        [DriverStatus.ON_DUTY, 35],
        [DriverStatus.OFF_DUTY, 15],
      ]),
      isDemo: true,
    });
  }
  await prisma.driver.createMany({ data: drivers });
  console.log(`Created ${drivers.length} demo drivers.`);

  // --- Equipment -----------------------------------------------------------
  type EquipmentRow = Prisma.EquipmentCreateManyInput & { id: string };
  const equipment: EquipmentRow[] = [];
  const equipmentByType = new Map<string, EquipmentRow[]>();
  // Collision-proof against any pre-existing equipment (e.g. the base
  // prisma/seed.ts fixture) rather than assuming a fresh table.
  const usedUnitNumbers = new Set((await prisma.equipment.findMany({ select: { unitNumber: true } })).map((e) => e.unitNumber));
  function nextUnitNumber(prefix: string): string {
    let n: string;
    do {
      n = `${prefix}-${randInt(1000, 9999)}`;
    } while (usedUnitNumbers.has(n));
    usedUnitNumbers.add(n);
    return n;
  }

  for (const t of EQUIPMENT_TYPE_DEFS) {
    const count = EQUIPMENT_COUNTS[t.code] ?? 0;
    const bucket: EquipmentRow[] = [];
    const prefix = t.code === "V" ? "TRL" : t.code === "R" ? "RFR" : t.code === "F" ? "FLT" : t.code === "PO" ? "TRK" : t.code;
    for (let i = 0; i < count; i++) {
      // A few units are overdue/due-soon for maintenance so the dashboard
      // alert panel and roster "Maintenance" column both have real signal.
      const nextMaintenance = chance(0.15) ? daysFromNow(-randInt(-14, 5)) : daysFromNow(-randInt(15, 150));
      const row: EquipmentRow = {
        id: randomUUID(),
        unitNumber: nextUnitNumber(prefix),
        typeCode: t.code,
        status: pickWeighted<EquipmentStatus>([
          [EquipmentStatus.AVAILABLE, 55],
          [EquipmentStatus.IN_USE, 35],
          [EquipmentStatus.MAINTENANCE, 10],
        ]),
        nextMaintenance,
        isDemo: true,
      };
      equipment.push(row);
      bucket.push(row);
    }
    equipmentByType.set(t.code, bucket);
  }
  await prisma.equipment.createMany({ data: equipment });
  console.log(`Created ${equipment.length} demo equipment units.`);

  const maintenanceRows: Prisma.EquipmentMaintenanceRecordCreateManyInput[] = [];
  for (const e of equipment) {
    const recordCount = randInt(1, 3);
    for (let i = 0; i < recordCount; i++) {
      maintenanceRows.push({
        id: randomUUID(),
        equipmentId: e.id,
        date: daysFromNow(randInt(30, 1000)),
        description: pick(MAINTENANCE_DESCRIPTIONS),
        cost: randInt(120, 2400) * USD_TO_ETB_RATE,
        performedBy: pick(["Fleet Services Inc.", "QuickLube Truck Center", "In-house shop", "Roadside Rescue Diesel"]),
      });
    }
  }
  await prisma.equipmentMaintenanceRecord.createMany({ data: maintenanceRows });
  console.log(`Created ${maintenanceRows.length} equipment maintenance records.`);

  // --- Loads -----------------------------------------------------------------
  type LoadRow = Omit<Prisma.LoadCreateManyInput, "pickupTime" | "deliveryTime" | "status" | "payoutStatus"> & {
    id: string;
    pickupTime: Date;
    deliveryTime: Date;
    status: LoadStatus;
    payoutStatus: PayoutStatus;
  };
  const loads: LoadRow[] = [];
  // Collision-proof against any pre-existing loads, same reasoning as
  // equipment unit numbers above.
  const existingLoadNumbers = await prisma.load.findMany({ select: { loadNumber: true } });
  let loadSeq = 1000;
  for (const { loadNumber } of existingLoadNumbers) {
    const m = /^HL-(\d+)$/.exec(loadNumber);
    if (m) loadSeq = Math.max(loadSeq, parseInt(m[1], 10));
  }
  const totalHistoricalDays = YEARS_OF_HISTORY * 365 - 10;

  function pickEquipmentTypeCode(): string {
    return pickWeighted(EQUIPMENT_TYPE_DEFS.map((t) => [t.code, t.weight] as [string, number]));
  }
  function pickEquipmentForType(typeCode: string): EquipmentRow {
    const bucket = equipmentByType.get(typeCode) ?? equipment;
    return pick(bucket.length ? bucket : equipment);
  }

  function buildLoad(opts: {
    pickupTime: Date;
    status: LoadStatus;
    payoutStatus: PayoutStatus;
    assign: boolean;
    rateMultiplier: number;
  }): LoadRow {
    const [origin, destination, laneKind] = pick(CITY_PAIRS);
    const [minH, maxH] = TRANSIT_HOURS[laneKind];
    const transitHours = randInt(minH, maxH);
    const deliveryTime = new Date(opts.pickupTime.getTime() + transitHours * 3_600_000);
    const equipmentTypeCode = pickEquipmentTypeCode();
    const baseRate = laneKind === "long" ? randInt(2200, 4600) : laneKind === "medium" ? randInt(1200, 2800) : randInt(650, 1700);
    const rate = Math.round(baseRate * opts.rateMultiplier * USD_TO_ETB_RATE);
    const weight = randInt(8000, 45000);
    const driver = opts.assign ? pick(drivers) : null;
    const equip = opts.assign ? pickEquipmentForType(equipmentTypeCode) : null;

    loadSeq += 1;
    return {
      id: randomUUID(),
      loadNumber: `HL-${loadSeq}`,
      customerId: pick(customers).id,
      origin,
      destination,
      pickupTime: opts.pickupTime,
      deliveryTime,
      status: opts.status,
      rate,
      weight,
      commodity: pick(COMMODITIES),
      equipmentTypeCode,
      driverId: driver?.id ?? null,
      equipmentId: equip?.id ?? null,
      driverPay: Math.round(rate * 0.68),
      payoutStatus: opts.payoutStatus,
      isDemo: true,
    };
  }

  // Phase A — historical (completed) loads spread across the last 3 years,
  // skewed toward more-recent months to simulate business growth.
  for (let i = 0; i < HISTORICAL_LOAD_COUNT; i++) {
    const daysAgo = Math.floor(totalHistoricalDays * Math.pow(rand(), 1.6)) + 10;
    const pickupTime = daysFromNow(daysAgo, randInt(5, 17), pick([0, 15, 30, 45]));
    const recencyFactor = 1 - daysAgo / totalHistoricalDays; // 0 (old) .. ~1 (recent)
    const rateMultiplier = 1 + recencyFactor * 0.35;

    const unbilledProb = daysAgo < 45 ? 0.3 : daysAgo < 120 ? 0.1 : 0.03;
    const isUnbilled = chance(unbilledProb);
    const status = isUnbilled ? LoadStatus.DELIVERED : LoadStatus.BILLED;
    let payoutStatus: PayoutStatus;
    if (isUnbilled) payoutStatus = PayoutStatus.NOT_BILLED;
    else payoutStatus = chance(0.1) ? PayoutStatus.PENDING : PayoutStatus.PAID;

    loads.push(buildLoad({ pickupTime, status, payoutStatus, assign: true, rateMultiplier }));
  }

  // Phase B — active/live loads clustered around "now" so the board,
  // dashboard, and roster all show a realistic current operational picture.
  const now = Date.now();
  for (let i = 0; i < ACTIVE_LOAD_COUNT; i++) {
    const offsetDays = randInt(-7, 10); // negative = pickup in the future
    const pickupTime = daysFromNow(offsetDays, randInt(5, 17), pick([0, 15, 30, 45]));
    const [, , laneKind] = pick(CITY_PAIRS);
    const [minH, maxH] = TRANSIT_HOURS[laneKind];
    const deliveryTime = new Date(pickupTime.getTime() + randInt(minH, maxH) * 3_600_000);

    let status: LoadStatus;
    let payoutStatus: PayoutStatus = PayoutStatus.NOT_BILLED;
    let assign = true;

    if (deliveryTime.getTime() < now) {
      status = chance(0.82) ? LoadStatus.DELIVERED : LoadStatus.BILLED;
      if (status === LoadStatus.BILLED) payoutStatus = chance(0.3) ? PayoutStatus.PENDING : PayoutStatus.PAID;
    } else if (pickupTime.getTime() <= now && deliveryTime.getTime() >= now) {
      status = LoadStatus.IN_TRANSIT;
    } else {
      const daysOut = (pickupTime.getTime() - now) / 86_400_000;
      if (daysOut <= 3) {
        status = chance(0.6) ? LoadStatus.DISPATCHED : LoadStatus.ASSIGNED;
      } else {
        status = chance(0.3) ? LoadStatus.DRAFT : LoadStatus.ASSIGNED;
        assign = status !== LoadStatus.DRAFT;
      }
    }

    loads.push(buildLoad({ pickupTime, status, payoutStatus, assign, rateMultiplier: 1.35 }));
  }

  for (let i = 0; i < loads.length; i += 200) {
    await prisma.load.createMany({ data: loads.slice(i, i + 200) });
  }
  console.log(`Created ${loads.length} demo loads (${HISTORICAL_LOAD_COUNT} historical + ${ACTIVE_LOAD_COUNT} active).`);

  // --- Load activity trail ----------------------------------------------------
  const activityRows: Prisma.LoadActivityCreateManyInput[] = [];
  const STATUS_LABEL: Record<LoadStatus, string> = {
    DRAFT: "Draft", ASSIGNED: "Assigned", DISPATCHED: "Dispatched",
    IN_TRANSIT: "In Transit", DELIVERED: "Delivered", BILLED: "Billed",
  };
  for (const l of loads) {
    activityRows.push({
      id: randomUUID(),
      loadId: l.id,
      type: "CREATED",
      message: `Load ${l.loadNumber} created.`,
      actorUserId: demoUser.id,
      createdAt: new Date(l.pickupTime.getTime() - 3 * 86_400_000),
    });
    if (l.status !== LoadStatus.DRAFT) {
      activityRows.push({
        id: randomUUID(),
        loadId: l.id,
        type: "STATUS_CHANGE",
        message: `Status changed to ${STATUS_LABEL[l.status]}.`,
        actorUserId: demoUser.id,
        createdAt: new Date(l.pickupTime.getTime() - randInt(0, 2) * 86_400_000),
      });
    }
  }
  for (let i = 0; i < activityRows.length; i += 400) {
    await prisma.loadActivity.createMany({ data: activityRows.slice(i, i + 400) });
  }
  console.log(`Created ${activityRows.length} load activity entries.`);

  // --- Load comments -----------------------------------------------------------
  const commentRows: Prisma.LoadCommentCreateManyInput[] = [];
  for (const l of loads) {
    if (!chance(0.12)) continue;
    commentRows.push({
      id: randomUUID(),
      loadId: l.id,
      authorUserId: demoUser.id,
      body: pick(DISPATCH_NOTES),
      createdAt: new Date(l.pickupTime.getTime() - randInt(0, 2) * 86_400_000),
    });
  }
  if (commentRows.length) await prisma.loadComment.createMany({ data: commentRows });
  console.log(`Created ${commentRows.length} load comments.`);

  // --- Payments ------------------------------------------------------------
  const paymentRows: Prisma.PaymentCreateManyInput[] = [];
  for (const l of loads) {
    if (l.payoutStatus === PayoutStatus.PAID) {
      paymentRows.push({
        id: randomUUID(),
        loadId: l.id,
        amount: l.driverPay,
        paidAt: new Date(l.deliveryTime.getTime() + randInt(1, 12) * 86_400_000),
        method: pick(["ACH", "Check", "Wire"]),
      });
    } else if (l.payoutStatus === PayoutStatus.PENDING) {
      paymentRows.push({
        id: randomUUID(),
        loadId: l.id,
        amount: Math.round(l.driverPay * (0.5 + rand() * 0.35)),
        paidAt: new Date(l.deliveryTime.getTime() + randInt(1, 8) * 86_400_000),
        method: pick(["ACH", "Check"]),
        note: "Partial payment — balance outstanding.",
      });
    }
  }
  for (let i = 0; i < paymentRows.length; i += 400) {
    await prisma.payment.createMany({ data: paymentRows.slice(i, i + 400) });
  }
  console.log(`Created ${paymentRows.length} payment records.`);

  // --- Documents (BOL/POD) — real files uploaded through the active storage
  // driver (STORAGE_DRIVER env var), matching how the app itself uploads. ---
  const storage = getStorageDriver();
  function fakePdf(label: string): Buffer {
    const text = `Edget demo document — ${label}`;
    return Buffer.from(
      `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 120]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>endobj\n4 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n5 0 obj<</Length ${text.length + 24}>>stream\nBT /F1 12 Tf 12 60 Td (${text}) Tj ET\nendstream\nendobj\ntrailer<</Size 6/Root 1 0 R>>\n%%EOF`,
      "latin1"
    );
  }

  const eligibleLoads = loads.filter((l) => l.status === LoadStatus.BILLED || l.status === LoadStatus.DELIVERED);
  type DocPlan = { load: LoadRow; types: DocumentType[] };
  const docPlans: DocPlan[] = [];
  for (const l of eligibleLoads) {
    if (chance(0.22)) docPlans.push({ load: l, types: [DocumentType.BOL, DocumentType.POD] });
    else if (chance(0.13)) docPlans.push({ load: l, types: [DocumentType.BOL] });
  }
  const totalDocs = docPlans.reduce((s, p) => s + p.types.length, 0);
  console.log(`Uploading ${totalDocs} demo documents via ${process.env.STORAGE_DRIVER || "local"} storage driver...`);

  const documentRows: Prisma.DocumentCreateManyInput[] = [];
  let uploaded = 0;
  const CONCURRENCY = 12;
  let cursor = 0;
  async function worker() {
    while (cursor < docPlans.length) {
      const plan = docPlans[cursor++];
      for (const type of plan.types) {
        const fileName = `${type.toLowerCase()}-${plan.load.loadNumber}.pdf`;
        const storageKey = `demo/loads/${plan.load.id}/${type}/${randomUUID()}-${fileName}`;
        const buffer = fakePdf(`${plan.load.loadNumber} ${type}`);
        try {
          await storage.put(storageKey, buffer, "application/pdf");
          documentRows.push({
            id: randomUUID(),
            loadId: plan.load.id,
            type,
            fileName,
            storageKey,
            fileSizeBytes: buffer.byteLength,
            mimeType: "application/pdf",
            uploadedById: demoUser.id,
            uploadedAt: new Date(plan.load.deliveryTime.getTime() + randInt(0, 2) * 86_400_000),
          });
          uploaded += 1;
          if (uploaded % 50 === 0) console.log(`  uploaded ${uploaded}/${totalDocs}...`);
        } catch (err) {
          console.error(`  failed to upload ${storageKey}:`, err);
        }
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  for (let i = 0; i < documentRows.length; i += 200) {
    await prisma.document.createMany({ data: documentRows.slice(i, i + 200) });
  }
  console.log(`Created ${documentRows.length} document records.`);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\nDemo seed complete in ${elapsed}s.`);
  console.log(`Log in with: ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`);
  console.log(`Then visit Settings and confirm "Show demo data" is on (it defaults to on for this account).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ---------------------------------------------------------------------------
// Cleanup (not run automatically): to remove all demo data, run:
//   DELETE FROM loads WHERE "isDemo" = true;
//   DELETE FROM customers WHERE "isDemo" = true;
//   DELETE FROM drivers WHERE "isDemo" = true;
//   DELETE FROM equipment WHERE "isDemo" = true;
// (Documents/activities/comments/payments cascade-delete with their load.)
// ---------------------------------------------------------------------------
