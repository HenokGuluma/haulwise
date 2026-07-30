import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { customerContactSchema } from "@/lib/validation";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN", "DISPATCHER"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = customerContactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const contact = await prisma.$transaction(async (tx) => {
    if (parsed.data.isPrimary) {
      await tx.customerContact.updateMany({ where: { customerId: params.id }, data: { isPrimary: false } });
    }
    return tx.customerContact.create({ data: { ...parsed.data, email: parsed.data.email || null, customerId: params.id } });
  });

  return NextResponse.json({ contact }, { status: 201 });
}
