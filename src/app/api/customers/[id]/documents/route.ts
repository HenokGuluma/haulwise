import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { getStorageDriver, ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/storage";
import { fullName } from "@/lib/format";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("documents:upload");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const customer = await prisma.customer.findUnique({ where: { id: params.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });

  const label = String(formData.get("label") ?? "").trim();
  if (!label) return NextResponse.json({ error: "A label (e.g. Contract) is required." }, { status: 400 });

  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing file." }, { status: 400 });
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Only PDF, PNG, and JPG files are supported." }, { status: 400 });
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large (15MB max)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = `customers/${customer.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
  await getStorageDriver().put(storageKey, buffer, file.type);

  const document = await prisma.customerDocument.create({
    data: {
      customerId: customer.id,
      label,
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
