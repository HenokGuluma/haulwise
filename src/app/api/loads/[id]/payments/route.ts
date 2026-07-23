import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { fmtMoney } from "@/lib/format";
import { z } from "zod";

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than 0."),
  paidAt: z.coerce.date(),
  method: z.string().trim().max(60).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const payments = await prisma.payment.findMany({ where: { loadId: params.id }, orderBy: { paidAt: "desc" } });
  return NextResponse.json({ payments });
}

// Logging a payment is a financial action — same Admin-only gate as toggling
// payoutStatus directly. Recomputes and syncs payoutStatus from the running
// total so existing filters/CSV/dashboard code keeps working unchanged.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const load = await prisma.load.findUnique({ where: { id: params.id } });
  if (!load) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  const parsed = paymentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const payment = await prisma.payment.create({
    data: { loadId: load.id, amount: Math.round(parsed.data.amount), paidAt: parsed.data.paidAt, method: parsed.data.method || null, note: parsed.data.note || null },
  });

  const agg = await prisma.payment.aggregate({ where: { loadId: load.id }, _sum: { amount: true } });
  const amountPaid = agg._sum.amount ?? 0;
  const nextStatus = amountPaid >= load.driverPay ? "PAID" : amountPaid > 0 ? "PENDING" : "NOT_BILLED";

  const updated = await prisma.load.update({
    where: { id: load.id },
    data: { payoutStatus: nextStatus },
    include: { customer: true, driver: true, equipment: true, documents: { orderBy: { uploadedAt: "desc" } } },
  });

  await logActivity(load.id, "PAYMENT_LOGGED", `Logged payment of ${fmtMoney(payment.amount)} (${amountPaid >= load.driverPay ? "paid in full" : fmtMoney(load.driverPay - amountPaid) + " remaining"}).`, auth.user.id);

  return NextResponse.json({ payment, load: updated, amountPaid }, { status: 201 });
}
