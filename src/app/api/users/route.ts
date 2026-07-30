import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validation";
import { parseListParams } from "@/lib/pagination";

const SORT_MAP: Record<string, keyof Prisma.UserOrderByWithRelationInput> = {
  firstName: "firstName",
  email: "email",
  role: "role",
  createdAt: "createdAt",
};

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

export async function GET(req: NextRequest) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const { page, pageSize, sortBy, sortDir, search } = parseListParams(searchParams);

  const where: Prisma.UserWhereInput = {
    OR: search
      ? [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };

  const orderKey = (sortBy && SORT_MAP[sortBy]) || "firstName";
  const orderBy = { [orderKey]: sortDir } as Prisma.UserOrderByWithRelationInput;

  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, select: USER_SELECT, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ rows, total });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });

  if (data.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName ?? "",
      email: data.email.toLowerCase().trim(),
      passwordHash,
      role: data.role,
      customerId: data.role === "CUSTOMER" ? data.customerId : null,
    },
    select: USER_SELECT,
  });

  return NextResponse.json({ user }, { status: 201 });
}
