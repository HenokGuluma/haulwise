import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { getStorageDriver, ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/storage";
import { fullName } from "@/lib/format";
import { z } from "zod";

const typeSchema = z.enum(["DRIVERS_LICENSE", "MEDICAL_CERT", "MVR"]);

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN", "DISPATCHER"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const documents = await prisma.driverDocument.findMany({
    where: { driverId: params.id },
    orderBy: { uploadedAt: "desc" },
    include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
  });
  return NextResponse.json({
    documents: documents.map((d) => ({
      ...d,
      uploadedBy: d.uploadedBy ? { id: d.uploadedBy.id, name: fullName(d.uploadedBy.firstName, d.uploadedBy.lastName) } : null,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireRole(["ADMIN", "DISPATCHER"]);
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
    include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
  });

  return NextResponse.json({
    document: { ...document, uploadedBy: document.uploadedBy ? { id: document.uploadedBy.id, name: fullName(document.uploadedBy.firstName, document.uploadedBy.lastName) } : null },
  }, { status: 201 });
}
