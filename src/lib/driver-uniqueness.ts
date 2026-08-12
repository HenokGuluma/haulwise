import { prisma } from "@/lib/prisma";

// Driver name (first + last, case-insensitive) and phone must be unique among
// real (non-demo) drivers. Returns a user-facing error string when the
// proposed values collide with another driver, or null when they're clear.
// Pass excludeId when editing so a driver doesn't conflict with itself.
export async function driverUniquenessError(
  firstName: string,
  lastName: string,
  phone: string,
  excludeId?: string
): Promise<string | null> {
  const notSelf = excludeId ? { id: { not: excludeId } } : {};

  const nameDup = await prisma.driver.findFirst({
    where: {
      firstName: { equals: firstName, mode: "insensitive" },
      lastName: { equals: lastName, mode: "insensitive" },
      isDemo: false,
      ...notSelf,
    },
    select: { id: true },
  });
  if (nameDup) return "A driver with this name already exists.";

  const phoneDup = await prisma.driver.findFirst({
    where: { phone, isDemo: false, ...notSelf },
    select: { id: true },
  });
  if (phoneDup) return "A driver with this phone number already exists.";

  return null;
}
