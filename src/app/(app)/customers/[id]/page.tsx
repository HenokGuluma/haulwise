import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser, requireInternalRole, requirePagePermission } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { CustomerDetailView } from "@/components/CustomerDetailView";
import { demoScope } from "@/lib/demo-scope";
import { fullName } from "@/lib/format";
import type { CustomerWithDetail } from "@/types";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const customer = await prisma.customer.findUnique({ where: { id: params.id }, select: { companyName: true } });
  return { title: customer ? customer.companyName : "Customer Details" };
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  requireInternalRole(user);
  requirePagePermission(user, "customers:view");

  const customer = await prisma.customer.findUnique({
    where: { id: params.id, ...demoScope(user) },
    include: {
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      documents: { orderBy: { uploadedAt: "desc" }, include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } } },
    },
  });
  if (!customer) notFound();

  const withComposedNames = {
    ...customer,
    documents: customer.documents.map((d) => ({
      ...d,
      uploadedBy: d.uploadedBy ? { id: d.uploadedBy.id, name: fullName(d.uploadedBy.firstName, d.uploadedBy.lastName) } : null,
    })),
  };

  return <CustomerDetailView user={user} initialCustomer={JSON.parse(JSON.stringify(withComposedNames)) as CustomerWithDetail} />;
}
