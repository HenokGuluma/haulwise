import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { getStorageDriver, ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/storage";
import { z } from "zod";

const typeSchema = z.enum(["CDL", "MEDICAL_CERT", "MVR"]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const documents = await prisma.driverDocument.findMany({
    where: { driverId: params.id },
    orderBy: { uploadedAt: "desc" },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const driver = await prisma.driver.findUnique({ where: { id: params.id } });
  if (!driver) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });

  const typeParsed = typeSchema.safeParse(formData.get("type"));
  if (!typeParsed.success) return NextResponse.json({ error: "Missing or invalid document type." }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only PDF, PNG, and JPG files are supported." }, { status: 400 });
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large (15MB max)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = `drivers/${driver.id}/${typeParsed.data}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  await getStorageDriver().put(storageKey, buffer, file.type);

  const document = await prisma.driverDocument.create({
    data: {
      driverId: driver.id,
      type: typeParsed.data,
      fileName: file.name,
      storageKey,
      fileSizeBytes: buffer.byteLength,
      mimeType: file.type,
      uploadedById: auth.user.id,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ document }, { status: 201 });
}
