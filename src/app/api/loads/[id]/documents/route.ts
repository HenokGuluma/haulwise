import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { documentUploadSchema } from "@/lib/validation";
import { z } from "zod";

const DOCUMENT_TYPES = ["BOL", "POD", "RATE_CONFIRMATION"] as const;

// NOTE: this stores document *metadata* (type + file name), matching the MVP
// scope in the spec ("Upload POD / BOL / rate confirmation to a load"). Wiring
// this to actual file storage (S3-compatible bucket, per the spec's tech
// stack) is a drop-in change here — swap the fileName-only write for an
// upload to storage plus a stored URL, without touching the rest of the app.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const load = await prisma.load.findUnique({ where: { id: params.id } });
  if (!load) return NextResponse.json({ error: "Load not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = documentUploadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const document = await prisma.document.upsert({
    where: { loadId_type: { loadId: load.id, type: parsed.data.type } },
    update: { fileName: parsed.data.fileName, uploadedAt: new Date() },
    create: { loadId: load.id, type: parsed.data.type, fileName: parsed.data.fileName },
  });

  return NextResponse.json({ document }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { searchParams } = new URL(req.url);
  const typeParam = searchParams.get("type");
  const parsed = z.enum(DOCUMENT_TYPES).safeParse(typeParam);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing or invalid document type." }, { status: 400 });
  }

  await prisma.document.deleteMany({ where: { loadId: params.id, type: parsed.data } });
  return NextResponse.json({ ok: true });
}
