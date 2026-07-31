import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { getStorageDriver } from "@/lib/storage";

export async function GET(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const auth = await requirePermission("documents:view");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const doc = await prisma.customerDocument.findUnique({ where: { id: params.docId } });
  if (!doc || doc.customerId !== params.id) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  const file = await getStorageDriver().get(doc.storageKey);
  if (!file) return NextResponse.json({ error: "File is missing from storage." }, { status: 404 });

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(file.buffer.byteLength),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const auth = await requirePermission("documents:delete");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const doc = await prisma.customerDocument.findUnique({ where: { id: params.docId } });
  if (!doc || doc.customerId !== params.id) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  await getStorageDriver().delete(doc.storageKey);
  await prisma.customerDocument.delete({ where: { id: doc.id } });

  return NextResponse.json({ ok: true });
}
