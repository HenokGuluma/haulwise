import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const customers = await prisma.customer.findMany({ orderBy: { companyName: "asc" } });
  return NextResponse.json({ customers });
}
