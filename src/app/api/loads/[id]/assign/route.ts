import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { assignSchema } from "@/lib/validation";
import { findConflicts } from "@/lib/conflicts";
import { logActivity } from "@/lib/activity";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("loads:assign");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const load = await prisma.load.findUnique({ where: { id: params.id } });
  if (!load) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const { driverId } = parsed.data;

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  // Equipment is pulled from the driver's linked equipment — the load never
  // gets equipment chosen independently of the driver. To put different
  // equipment on a load, the driver's linked equipment is changed first.
  if (!driver.equipmentId) {
    return NextResponse.json(
      { error: "This driver has no linked equipment. Link equipment to the driver first (Roster → edit driver)." },
      { status: 409 }
    );
  }
  const equipmentId = driver.equipmentId;
  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
  if (!equipment) return NextResponse.json({ error: "The driver's linked equipment no longer exists." }, { status: 409 });

  // This is the server-side source of truth for double-booking prevention —
  // the dispatch board's client-side check calls this same endpoint, so a
  // conflict can't be saved no matter which UI path (board drag, assign
  // modal, or a future integration) triggers the request.
  const conflicts = await findConflicts({
    loadId: load.id,
    pickupTime: load.pickupTime,
    deliveryTime: load.deliveryTime,
    driverId,
    equipmentId,
  });

  if (conflicts.length > 0) {
    return NextResponse.json(
      {
        error: `This driver or equipment is already committed to ${conflicts
          .map((c) => c.loadNumber)
          .join(", ")} during an overlapping time window.`,
        conflicts,
      },
      { status: 409 }
    );
  }

  const updated = await prisma.load.update({
    where: { id: load.id },
    data: {
      driverId,
      equipmentId,
      status: load.status === "DRAFT" ? "ASSIGNED" : load.status,
    },
    include: { customer: true, driver: true, equipment: true, documents: { orderBy: { uploadedAt: "desc" } } },
  });

  const action = load.driverId || load.equipmentId ? "Reassigned" : "Assigned";
  await logActivity(load.id, "ASSIGNED", `${action} to ${driver.firstName} ${driver.lastName} / ${equipment.unitNumber}.`, auth.user.id);

  return NextResponse.json({ load: updated });
}
