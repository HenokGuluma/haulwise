import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requirePermission } from "@/lib/auth";
import { loadUpdateSchema } from "@/lib/validation";
import { findConflicts } from "@/lib/conflicts";
import { getStorageDriver } from "@/lib/storage";
import { logActivity } from "@/lib/activity";
import { statusLabel } from "@/lib/format";
import { demoScope } from "@/lib/demo-scope";
import { customerScope } from "@/lib/customer-scope";

const LOAD_INCLUDE = { customer: true, driver: true, equipment: true, documents: { orderBy: { uploadedAt: "desc" } } } as const;

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const load = await prisma.load.findUnique({
    where: { id: params.id, ...demoScope(auth.user), ...customerScope(auth.user) },
    include: LOAD_INCLUDE,
  });
  if (!load) return NextResponse.json({ error: "Load not found." }, { status: 404 });
  return NextResponse.json({ load });
}

// Status transitions that require both a driver and equipment to already be
// assigned before they're allowed — mirrors the dispatch board's drag rule.
const REQUIRES_ASSIGNMENT = new Set(["ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"]);

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  // Split permission model: general load fields need loads:edit, but
  // rate/payoutStatus are finance actions gated on payments:manage instead —
  // this lets an Accountant (payments:manage, no loads:edit) log payouts
  // and correct rates without being able to touch dispatch details, while a
  // Dispatcher (loads:edit, no payments:manage) can't touch payout status,
  // mirroring the original Admin-only payout-toggle rule.
  const perms = auth.user.permissions;
  const canEditLoad = perms.includes("loads:edit");
  const canManagePayments = perms.includes("payments:manage");
  if (!canEditLoad && !canManagePayments) {
    return NextResponse.json({ error: "You don't have permission to perform this action." }, { status: 403 });
  }

  const existing = await prisma.load.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = loadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const patch = parsed.data;

  if (patch.payoutStatus !== undefined && !canManagePayments) {
    return NextResponse.json({ error: "You don't have permission to perform this action." }, { status: 403 });
  }
  const otherFields = Object.keys(patch).filter((k) => k !== "payoutStatus" && k !== "rate");
  if (otherFields.length > 0 && !canEditLoad) {
    return NextResponse.json({ error: "You don't have permission to perform this action." }, { status: 403 });
  }

  if (patch.equipmentTypeCode) {
    const equipmentType = await prisma.equipmentType.findUnique({ where: { code: patch.equipmentTypeCode } });
    if (!equipmentType) return NextResponse.json({ error: "Unknown equipment type." }, { status: 400 });
  }

  const nextStatus = patch.status ?? existing.status;
  const nextPickup = patch.pickupTime ?? existing.pickupTime;
  const nextDelivery = patch.deliveryTime ?? existing.deliveryTime;

  if (REQUIRES_ASSIGNMENT.has(nextStatus) && (!existing.driverId || !existing.equipmentId)) {
    return NextResponse.json(
      { error: `Assign a driver and equipment before moving to ${nextStatus}.` },
      { status: 409 }
    );
  }

  // If the load already has a driver/equipment and its schedule is changing,
  // re-check for conflicts against the new window.
  if ((patch.pickupTime || patch.deliveryTime) && (existing.driverId || existing.equipmentId)) {
    const conflicts = await findConflicts({
      loadId: existing.id,
      pickupTime: nextPickup,
      deliveryTime: nextDelivery,
      driverId: existing.driverId,
      equipmentId: existing.equipmentId,
    });
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: `These dates conflict with ${conflicts.map((c) => c.loadNumber).join(", ")} for the assigned driver/equipment.`,
          conflicts,
        },
        { status: 409 }
      );
    }
  }

  const load = await prisma.load.update({
    where: { id: params.id },
    data: {
      ...patch,
      driverPay: patch.rate !== undefined ? Math.round(patch.rate * 0.68) : undefined,
    },
    include: LOAD_INCLUDE,
  });

  if (patch.status && patch.status !== existing.status) {
    await logActivity(load.id, "STATUS_CHANGE", `Status changed from ${statusLabel(existing.status)} to ${statusLabel(patch.status)}.`, auth.user.id);
  }
  if (patch.payoutStatus && patch.payoutStatus !== existing.payoutStatus) {
    await logActivity(load.id, "PAYOUT_CHANGE", `Payout status changed to ${patch.payoutStatus.replace("_", " ")}.`, auth.user.id);
  }
  const fieldChanges = Object.keys(patch).filter((k) => k !== "status" && k !== "payoutStatus");
  if (fieldChanges.length > 0) {
    await logActivity(load.id, "UPDATED", `Updated ${fieldChanges.join(", ")}.`, auth.user.id);
  }

  return NextResponse.json({ load });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("loads:delete");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.load.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  // The DB cascade-deletes Document rows, but their stored files live
  // outside Postgres — clean those up first or they'd be orphaned.
  const docs = await prisma.document.findMany({ where: { loadId: params.id }, select: { storageKey: true } });
  const storage = getStorageDriver();
  await Promise.all(docs.map((d) => storage.delete(d.storageKey)));

  await prisma.load.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
