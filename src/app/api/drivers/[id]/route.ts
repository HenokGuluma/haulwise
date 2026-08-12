import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { driverUpdateSchema } from "@/lib/validation";
import { driverUniquenessError } from "@/lib/driver-uniqueness";
import { getStorageDriver } from "@/lib/storage";
import { demoScope } from "@/lib/demo-scope";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("roster:view");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const driver = await prisma.driver.findUnique({ where: { id: params.id, ...demoScope(auth.user) } });
  if (!driver) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  return NextResponse.json({ driver });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("roster:manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Same demo-visibility scope as GET — previously missing here, and the
  // blanket .catch(() => null) below on the update itself masked *any*
  // failure (a real DB error, not just "not found") behind the same
  // generic 404, which this existence pre-check now replaces.
  const existing = await prisma.driver.findUnique({ where: { id: params.id, ...demoScope(auth.user) } });
  if (!existing) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = driverUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const patch = parsed.data;

  // Re-check name/phone uniqueness whenever any of those fields is changing,
  // merging the patch over the current values so an edit that only touches
  // one of them is still validated against the whole identity.
  if (patch.firstName !== undefined || patch.lastName !== undefined || patch.phone !== undefined) {
    const conflict = await driverUniquenessError(
      patch.firstName ?? existing.firstName,
      patch.lastName ?? existing.lastName,
      patch.phone ?? existing.phone,
      params.id
    );
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 });
  }

  if (patch.equipmentId) {
    const eq = await prisma.equipment.findUnique({ where: { id: patch.equipmentId }, select: { id: true } });
    if (!eq) return NextResponse.json({ error: "Selected equipment no longer exists." }, { status: 400 });
  }

  const data = { ...patch, ...(patch.equipmentId !== undefined ? { equipmentId: patch.equipmentId || null } : {}) };
  const driver = await prisma.driver.update({ where: { id: params.id }, data });
  return NextResponse.json({ driver });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("roster:delete");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Same demo-visibility scope as GET/PATCH — see the comment in PATCH above.
  const existing = await prisma.driver.findUnique({ where: { id: params.id, ...demoScope(auth.user) } });
  if (!existing) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  const activeLoad = await prisma.load.findFirst({
    where: { driverId: params.id, status: { in: ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"] } },
  });
  if (activeLoad) {
    return NextResponse.json(
      { error: `Cannot delete — ${driverActiveLoadMessage(activeLoad.loadNumber)}` },
      { status: 409 }
    );
  }

  const docs = await prisma.driverDocument.findMany({ where: { driverId: params.id }, select: { storageKey: true } });
  const storage = getStorageDriver();
  await Promise.all(docs.map((d) => storage.delete(d.storageKey)));

  await prisma.driver.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

function driverActiveLoadMessage(loadNumber: string) {
  return `this driver is currently assigned to active load ${loadNumber}. Reassign or complete it first.`;
}
