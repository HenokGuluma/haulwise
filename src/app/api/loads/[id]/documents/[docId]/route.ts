import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requirePermission } from "@/lib/auth";
import { getStorageDriver } from "@/lib/storage";

async function findScopedDoc(loadId: string, docId: string, user: { isCustomerScoped: boolean; customerId: string | null }) {
  const doc = await prisma.document.findUnique({ where: { id: docId }, include: { load: true } });
  if (!doc || doc.loadId !== loadId) return null;
  if (user.isCustomerScoped && doc.load.customerId !== user.customerId) return null;
  return doc;
}

/** Streams the stored file back — used for inline preview (images/PDFs) and download links. */
export async function GET(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const auth = await requireUser();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const doc = await findScopedDoc(params.id, params.docId, auth.user);
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

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

/** Removes one specific document version (both the DB row and the stored file). */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  const auth = await requirePermission("documents:delete");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const doc = await findScopedDoc(params.id, params.docId, auth.user);
  if (!doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  await getStorageDriver().delete(doc.storageKey);
  await prisma.document.delete({ where: { id: doc.id } });

  return NextResponse.json({ ok: true });
}
