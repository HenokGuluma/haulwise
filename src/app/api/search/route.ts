import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { demoScope } from "@/lib/demo-scope";

const LIMIT = 6;

/** Backs the global command palette (Cmd/Ctrl+K) — a small top-N slice per entity type. */
export async function GET(req: NextRequest) {
  const auth = await requireRole(["ADMIN", "DISPATCHER"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ loads: [], drivers: [], equipment: [], customers: [] });

  const scope = demoScope(auth.user);
  const [loads, drivers, equipment, customers] = await Promise.all([
    prisma.load.findMany({
      where: {
        ...scope,
        OR: [
          { loadNumber: { contains: q, mode: "insensitive" } },
          { origin: { contains: q, mode: "insensitive" } },
          { destination: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, loadNumber: true, origin: true, destination: true, status: true },
      take: LIMIT,
    }),
    prisma.driver.findMany({
      where: {
        ...scope,
        OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { licenseNo: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, firstName: true, lastName: true, status: true },
      take: LIMIT,
    }),
    prisma.equipment.findMany({
      where: { ...scope, unitNumber: { contains: q, mode: "insensitive" } },
      select: { id: true, unitNumber: true, typeCode: true, status: true },
      take: LIMIT,
    }),
    prisma.customer.findMany({
      where: {
        ...scope,
        OR: [
          { companyName: { contains: q, mode: "insensitive" } },
          { contactName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, companyName: true, status: true },
      take: LIMIT,
    }),
  ]);

  return NextResponse.json({ loads, drivers, equipment, customers });
}
