import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

/** Combined audit trail + comments for a load's detail-drawer timeline. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [activities, comments] = await Promise.all([
    prisma.loadActivity.findMany({
      where: { loadId: params.id },
      orderBy: { createdAt: "desc" },
      include: { actorUser: { select: { id: true, name: true } } },
    }),
    prisma.loadComment.findMany({
      where: { loadId: params.id },
      orderBy: { createdAt: "desc" },
      include: { authorUser: { select: { id: true, name: true } } },
    }),
  ]);

  return NextResponse.json({ activities, comments });
}
