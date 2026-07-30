import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { userUpdateSchema } from "@/lib/validation";

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  customerId: true,
  customer: { select: { id: true, companyName: true } },
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const patch = parsed.data;

  if (patch.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: patch.email.toLowerCase().trim() } });
    if (emailTaken && emailTaken.id !== params.id) {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }
  }

  // Validate the merged (existing + patch) role/customerId state — a partial
  // update can't see prior state inside the Zod schema itself.
  const mergedRole = patch.role ?? existing.role;
  const mergedCustomerId = patch.customerId !== undefined ? patch.customerId : existing.customerId;
  if (mergedRole === "CUSTOMER" && !mergedCustomerId) {
    return NextResponse.json({ error: "Select a customer for a Customer-role account." }, { status: 400 });
  }

  if (patch.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: patch.customerId } });
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      firstName: patch.firstName,
      lastName: patch.lastName,
      email: patch.email ? patch.email.toLowerCase().trim() : undefined,
      role: patch.role,
      customerId: mergedRole === "CUSTOMER" ? mergedCustomerId : null,
      passwordHash: patch.password ? await bcrypt.hash(patch.password, 10) : undefined,
    },
    select: USER_SELECT,
  });

  return NextResponse.json({ user });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (params.id === auth.user.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "User not found." }, { status: 404 });

  try {
    await prisma.user.delete({ where: { id: params.id } });
  } catch (err) {
    // Users who have authored load comments can't be deleted (that relation
    // has no onDelete: SetNull, unlike documents/activity) — a real, likely
    // scenario for any staff account with history, not just an edge case.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return NextResponse.json(
        { error: "Can't delete this user — they've left comments on one or more loads." },
        { status: 409 }
      );
    }
    throw err;
  }
  return NextResponse.json({ ok: true });
}
