import "server-only";
import { prisma } from "@/lib/prisma";
import { LoadStatus } from "@prisma/client";

// A load only "counts" toward a conflict if it's still active — a Delivered or
// Billed load no longer occupies the driver/equipment's schedule.
const ACTIVE_STATUSES: LoadStatus[] = [
  LoadStatus.DRAFT,
  LoadStatus.ASSIGNED,
  LoadStatus.DISPATCHED,
  LoadStatus.IN_TRANSIT,
];

export type ConflictCandidate = {
  loadId?: string; // omit when checking a not-yet-created load
  pickupTime: Date;
  deliveryTime: Date;
  driverId?: string | null;
  equipmentId?: string | null;
};

export type ConflictingLoad = {
  id: string;
  loadNumber: string;
  status: LoadStatus;
  pickupTime: Date;
  deliveryTime: Date;
  driverId: string | null;
  equipmentId: string | null;
};

/**
 * Finds any other active loads that share the given driver and/or equipment
 * AND whose pickup/delivery window overlaps the candidate's window.
 *
 * Two windows [aStart, aEnd) and [bStart, bEnd) overlap iff aStart < bEnd AND
 * bStart < aEnd — touching endpoints (one load's delivery exactly equals
 * another's pickup) are NOT treated as a conflict.
 */
export async function findConflicts(candidate: ConflictCandidate): Promise<ConflictingLoad[]> {
  const { loadId, pickupTime, deliveryTime, driverId, equipmentId } = candidate;

  if (!driverId && !equipmentId) return [];

  const orConditions = [];
  if (driverId) orConditions.push({ driverId });
  if (equipmentId) orConditions.push({ equipmentId });

  const candidates = await prisma.load.findMany({
    where: {
      id: loadId ? { not: loadId } : undefined,
      status: { in: ACTIVE_STATUSES },
      OR: orConditions,
      // Overlap condition, pushed down into SQL rather than filtered in JS.
      AND: [{ pickupTime: { lt: deliveryTime } }, { deliveryTime: { gt: pickupTime } }],
    },
    select: {
      id: true,
      loadNumber: true,
      status: true,
      pickupTime: true,
      deliveryTime: true,
      driverId: true,
      equipmentId: true,
    },
  });

  return candidates;
}
