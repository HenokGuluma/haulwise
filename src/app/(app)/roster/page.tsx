import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { RosterView } from "@/components/RosterView";

export default async function RosterPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const loads = await prisma.load.findMany({
    where: { status: { in: ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"] } },
    select: { id: true, driverId: true, equipmentId: true },
  });

  return (
    <RosterView
      user={user}
      activeLoadCounts={{
        byDriver: countBy(loads, "driverId"),
        byEquipment: countBy(loads, "equipmentId"),
      }}
    />
  );
}

function countBy(rows: { driverId: string | null; equipmentId: string | null }[], key: "driverId" | "equipmentId") {
  const map: Record<string, number> = {};
  for (const row of rows) {
    const id = row[key];
    if (!id) continue;
    map[id] = (map[id] ?? 0) + 1;
  }
  return map;
}
