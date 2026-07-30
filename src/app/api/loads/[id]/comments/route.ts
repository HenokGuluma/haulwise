import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { z } from "zod";

const bodySchema = z.object({ body: z.string().trim().min(1, "Comment can't be empty.").max(2000) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN", "DISPATCHER"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const load = await prisma.load.findUnique({ where: { id: params.id } });
  if (!load) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const comment = await prisma.loadComment.create({
    data: { loadId: load.id, authorUserId: auth.user.id, body: parsed.data.body },
    include: { authorUser: { select: { id: true, firstName: true, lastName: true } } },
  });

  return NextResponse.json({
    comment: { ...comment, authorUser: { id: comment.authorUser.id, name: fullName(comment.authorUser.firstName, comment.authorUser.lastName) } },
  }, { status: 201 });
}
