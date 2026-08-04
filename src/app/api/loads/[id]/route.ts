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
import { computeRate, type RateType } from "@/lib/rate-calc";
import { computeDriverPay, type DriverPayType } from "@/lib/driver-pay-calc";

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
  const canConfigureRate = perms.includes("loads:configure-rate");
  if (!canEditLoad && !canManagePayments) {
    return NextResponse.json({ error: "You don't have permission to perform this action." }, { status: 403 });
  }

  // Same tenant/demo scope GET applies — without it, a customer-scoped
  // role that's been granted loads:edit/loads:delete via /roles (nothing
  // stops an admin from doing that) could patch or delete any load by id,
  // not just its own customer's.
  const existing = await prisma.load.findUnique({ where: { id: params.id, ...demoScope(auth.user), ...customerScope(auth.user) } });
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
  const changesRateBasis =
    patch.rateType !== undefined ||
    patch.rateBasisValue !== undefined ||
    patch.distanceKm !== undefined ||
    patch.driverPayType !== undefined ||
    patch.driverPayValue !== undefined;
  if (changesRateBasis && !canConfigureRate) {
    return NextResponse.json({ error: "You don't have permission to change how this load's rate or driver pay is calculated." }, { status: 403 });
  }
  const otherFields = Object.keys(patch).filter(
    (k) => !["payoutStatus", "rate", "rateType", "rateBasisValue", "distanceKm", "driverPayType", "driverPayValue"].includes(k)
  );
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

  // Rate stays consistent with its own basis: whenever the effective
  // (merged) rate type is non-FLAT, the total is always recomputed from
  // rateBasisValue × the type's quantity — even when this particular
  // patch only touched an unrelated field like weight — so a PER_QUINTAL
  // load's rate can never silently drift out of sync with a changed
  // weight. FLAT keeps the original behavior: trust whatever `rate` was
  // sent, or leave it alone if it wasn't.
  const effectiveRateType = (patch.rateType ?? existing.rateType) as RateType;
  const effectiveWeight = patch.weight ?? existing.weight;
  const effectiveDistanceKm = patch.distanceKm !== undefined ? patch.distanceKm : existing.distanceKm;
  const effectiveRateBasisValue = patch.rateBasisValue !== undefined ? patch.rateBasisValue : existing.rateBasisValue;

  let nextRate = existing.rate;
  if (effectiveRateType !== "FLAT") {
    nextRate = computeRate({
      rateType: effectiveRateType,
      rateBasisValue: effectiveRateBasisValue,
      flatRate: existing.rate,
      weight: effectiveWeight,
      distanceKm: effectiveDistanceKm,
      pickupTime: nextPickup,
      deliveryTime: nextDelivery,
    });
  } else if (patch.rate !== undefined) {
    nextRate = patch.rate;
  }

  // Same idea for driverPay — always recomputed from the effective basis
  // against nextRate (which may have just changed above), so it stays
  // consistent even when this patch never mentions driverPay at all.
  const effectiveDriverPayType = (patch.driverPayType ?? existing.driverPayType) as DriverPayType;
  const effectiveDriverPayValue = patch.driverPayValue !== undefined ? patch.driverPayValue : existing.driverPayValue;
  if (effectiveDriverPayType === "FLAT" && effectiveDriverPayValue > nextRate) {
    return NextResponse.json({ error: "Driver pay can't exceed the rate." }, { status: 400 });
  }
  const nextDriverPay = computeDriverPay({ driverPayType: effectiveDriverPayType, driverPayValue: effectiveDriverPayValue, rate: nextRate });

  const load = await prisma.load.update({
    where: { id: params.id },
    data: {
      ...patch,
      rate: nextRate,
      // Explicit rate-basis change — null out whatever doesn't apply to
      // the new type so a stale per-unit value or distance from a
      // previous type doesn't linger unused in the row.
      ...(patch.rateType !== undefined
        ? {
            rateBasisValue: patch.rateType === "FLAT" ? null : patch.rateBasisValue ?? existing.rateBasisValue,
            distanceKm: patch.rateType === "PER_KM" ? patch.distanceKm ?? existing.distanceKm : null,
          }
        : {}),
      driverPay: nextDriverPay,
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

  // Same tenant/demo scope GET/PATCH apply — see the comment in PATCH above.
  const existing = await prisma.load.findUnique({ where: { id: params.id, ...demoScope(auth.user), ...customerScope(auth.user) } });
  if (!existing) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  // The DB cascade-deletes Document rows, but their stored files live
  // outside Postgres — clean those up first or they'd be orphaned.
  const docs = await prisma.document.findMany({ where: { loadId: params.id }, select: { storageKey: true } });
  const storage = getStorageDriver();
  await Promise.all(docs.map((d) => storage.delete(d.storageKey)));

  await prisma.load.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
