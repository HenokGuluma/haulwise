import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { driverUpdateSchema } from "@/lib/validation";
import { getStorageDriver } from "@/lib/storage";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = driverUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const driver = await prisma.driver
    .update({ where: { id: params.id }, data: parsed.data })
    .catch(() => null);
  if (!driver) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  return NextResponse.json({ driver });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

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

  await prisma.driver.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}

function driverActiveLoadMessage(loadNumber: string) {
  return `this driver is currently assigned to active load ${loadNumber}. Reassign or complete it first.`;
}
