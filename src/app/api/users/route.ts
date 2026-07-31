import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validation";
import { parseListParams } from "@/lib/pagination";

const SORT_MAP: Record<string, keyof Prisma.UserOrderByWithRelationInput> = {
  firstName: "firstName",
  email: "email",
  createdAt: "createdAt",
};

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: { select: { id: true, name: true } },
  customerId: true,
  customer: { select: { id: true, companyName: true } },
  createdAt: true,
} satisfies Prisma.UserSelect;

export async function GET(req: NextRequest) {
  const auth = await requirePermission("users:view");
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

  // role sorts by the related Role's name, not a scalar column on User —
  // needs its own branch since it's not in SORT_MAP.
  const orderBy: Prisma.UserOrderByWithRelationInput =
    sortBy === "role" ? { role: { name: sortDir } } : { [SORT_MAP[sortBy ?? ""] ?? "firstName"]: sortDir };

  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, select: USER_SELECT, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ rows, total });
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("users:manage");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  if (existing) return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });

  const role = await prisma.role.findUnique({ where: { id: data.roleId } });
  if (!role) return NextResponse.json({ error: "Unknown role." }, { status: 400 });
  if (role.isCustomerScoped && !data.customerId) {
    return NextResponse.json({ error: "Select a customer for a customer-scoped role." }, { status: 400 });
  }

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
      roleId: data.roleId,
      customerId: role.isCustomerScoped ? data.customerId : null,
    },
    select: USER_SELECT,
  });

  return NextResponse.json({ user }, { status: 201 });
}
