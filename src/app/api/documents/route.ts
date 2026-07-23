import { NextRequest, NextResponse } from "next/server";
import { Prisma, DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { parseListParams } from "@/lib/pagination";

const SORT_MAP: Record<string, keyof Prisma.DocumentOrderByWithRelationInput> = {
  uploadedAt: "uploadedAt",
  type: "type",
  fileSizeBytes: "fileSizeBytes",
};

/** Cross-load document library — every uploaded document, searchable without opening each load. */
export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const { page, pageSize, sortBy, sortDir, search, filters } = parseListParams(searchParams);

  const typeFilter = filters.type as DocumentType[] | undefined;
  const where: Prisma.DocumentWhereInput = {
    type: typeFilter && typeFilter.length > 0 ? { in: typeFilter } : undefined,
    OR: search
      ? [
          { fileName: { contains: search, mode: "insensitive" } },
          { load: { loadNumber: { contains: search, mode: "insensitive" } } },
          { load: { customer: { companyName: { contains: search, mode: "insensitive" } } } },
        ]
      : undefined,
  };

  const orderKey = (sortBy && SORT_MAP[sortBy]) || "uploadedAt";
  const orderBy = { [orderKey]: sortDir } as Prisma.DocumentOrderByWithRelationInput;

  const [rows, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { load: { include: { customer: true } }, uploadedBy: { select: { id: true, name: true } } },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ]);

  return NextResponse.json({ rows, total });
}
