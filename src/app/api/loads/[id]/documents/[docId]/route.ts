import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { getStorageDriver } from "@/lib/storage";

/** Streams the stored file back — used for inline preview (images/PDFs) and download links. */
export async function GET(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const doc = await prisma.document.findUnique({ where: { id: params.docId }, include: { load: true } });
  if (!doc || doc.loadId !== params.id) return NextResponse.json({ error: "Document not found." }, { status: 404 });
  if (auth.user.role === "CUSTOMER" && doc.load.customerId !== auth.user.customerId) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

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

/** Removes one specific document version (both the DB row and the stored file). Admin only. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const auth = await requireRole(["ADMIN"]);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const doc = await prisma.document.findUnique({ where: { id: params.docId } });
  if (!doc || doc.loadId !== params.id) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  await getStorageDriver().delete(doc.storageKey);
  await prisma.document.delete({ where: { id: doc.id } });

  return NextResponse.json({ ok: true });
}
