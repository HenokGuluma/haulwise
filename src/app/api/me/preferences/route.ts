import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  showMockData: z.boolean().optional(),
  firstName: z.string().trim().min(1, "First name is required.").max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
});

export async function PATCH(req: NextRequest) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No changes provided." }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: auth.user.id },
    data: parsed.data,
  });

  return NextResponse.json({ firstName: user.firstName, lastName: user.lastName, showMockData: user.showMockData });
}
