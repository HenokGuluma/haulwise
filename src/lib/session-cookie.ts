// Split from lib/auth.ts so the Edge middleware can read the cookie name
// without pulling in bcryptjs/Prisma (both Node-only) into its bundle.
export const SESSION_COOKIE = "haulwise_session";
