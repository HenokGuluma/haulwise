import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName } from "@/lib/format";

/** Combined audit trail + comments for a load's detail-drawer timeline. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN", "DISPATCHER"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [activities, comments] = await Promise.all([
    prisma.loadActivity.findMany({
      where: { loadId: params.id },
      orderBy: { createdAt: "desc" },
      include: { actorUser: { select: { id: true, firstName: true, lastName: true } } },
    }),
    prisma.loadComment.findMany({
      where: { loadId: params.id },
      orderBy: { createdAt: "desc" },
      include: { authorUser: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  return NextResponse.json({
    activities: activities.map((a) => ({
      ...a,
      actorUser: a.actorUser ? { id: a.actorUser.id, name: fullName(a.actorUser.firstName, a.actorUser.lastName) } : null,
    })),
    comments: comments.map((c) => ({
      ...c,
      authorUser: { id: c.authorUser.id, name: fullName(c.authorUser.firstName, c.authorUser.lastName) },
    })),
  });
}
