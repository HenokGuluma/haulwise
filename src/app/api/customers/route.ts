import { NextRequest, NextResponse } from "next/server";
import { Prisma, CustomerStatus, LoadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { customerCreateSchema } from "@/lib/validation";
import { parseListParams } from "@/lib/pagination";
import { demoScope } from "@/lib/demo-scope";

const ACTIVE_STATUSES: LoadStatus[] = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"];

const SORT_MAP: Record<string, keyof Prisma.CustomerOrderByWithRelationInput> = {
  companyName: "companyName",
  contactName: "contactName",
  status: "status",
  createdAt: "createdAt",
};

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const { page, pageSize, sortBy, sortDir, search, filters } = parseListParams(searchParams);

  const statusFilter = filters.status as CustomerStatus[] | undefined;
  const where: Prisma.CustomerWhereInput = {
    ...demoScope(auth.user),
    status: statusFilter && statusFilter.length > 0 ? { in: statusFilter } : undefined,
    OR: search
      ? [
          { companyName: { contains: search, mode: "insensitive" } },
          { contactName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ]
      : undefined,
  };

  const orderKey = (sortBy && SORT_MAP[sortBy]) || "companyName";
  const orderBy = { [orderKey]: sortDir } as Prisma.CustomerOrderByWithRelationInput;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { loads: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  const activeCounts = customers.length
    ? await prisma.load.groupBy({
        by: ["customerId"],
        where: { customerId: { in: customers.map((c) => c.id) }, status: { in: ACTIVE_STATUSES } },
        _count: true,
      })
    : [];
  const activeMap = new Map(activeCounts.map((a) => [a.customerId, a._count]));

  const rows = customers.map((c) => ({
    ...c,
    totalLoadCount: c._count.loads,
    activeLoadCount: activeMap.get(c.id) ?? 0,
  }));

  return NextResponse.json({ rows, total });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = customerCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const customer = await prisma.customer.create({ data: parsed.data });
  return NextResponse.json({ customer }, { status: 201 });
}
