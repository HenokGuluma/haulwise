import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { CustomerDetailView } from "@/components/CustomerDetailView";
import { demoScope } from "@/lib/demo-scope";
import type { CustomerWithDetail } from "@/types";

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const customer = await prisma.customer.findUnique({
    where: { id: params.id, ...demoScope(user) },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      documents: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: { select: { id: true, name: true } } } },
    },
  });
  if (!customer) notFound();

  return <CustomerDetailView user={user} initialCustomer={JSON.parse(JSON.stringify(customer)) as CustomerWithDetail} />;
}
