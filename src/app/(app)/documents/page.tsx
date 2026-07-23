import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DocumentsView } from "@/components/DocumentsView";
import type { Load } from "@/types";

export default async function DocumentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const loads = await prisma.load.findMany({
    include: { customer: true, driver: true, equipment: true, documents: true },
    orderBy: { pickupTime: "desc" },
  });

  return <DocumentsView user={user} initialLoads={JSON.parse(JSON.stringify(loads)) as Load[]} />;
}
