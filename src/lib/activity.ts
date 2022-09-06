import "server-only";
import { prisma } from "@/lib/prisma";

export async function logActivity(loadId: string, type: string, message: string, actorUserId?: string) {
  await prisma.loadActivity.create({ data: { loadId, type, message, actorUserId } });
}
