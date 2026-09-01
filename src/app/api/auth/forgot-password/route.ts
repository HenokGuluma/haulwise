import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";
import { getMailer } from "@/lib/mailer";
import { fullName } from "@/lib/format";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

// Always returns the same generic response whether or not the email
// belongs to an account — a distinguishable response here would let an
// attacker enumerate which addresses have accounts.
const GENERIC_MESSAGE = "If an account exists for that email, a password reset link is on its way.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() } });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

    const proto = req.headers.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http");
    const host = req.headers.get("host");
    const resetUrl = `${proto}://${host}/reset-password?token=${rawToken}`;

    await getMailer().send({
      to: user.email,
      subject: "Reset your Cober Freight password",
      text: `Hi ${fullName(user.firstName, user.lastName)},\n\nWe received a request to reset your Cober Freight password. This link expires in 1 hour:\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email — your password won't change.`,
      html: `
        <p>Hi ${fullName(user.firstName, user.lastName)},</p>
        <p>We received a request to reset your Cober Freight password. This link expires in 1 hour:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you didn't request this, you can ignore this email — your password won't change.</p>
      `,
    }).catch((err) => {
      // Don't leak send failures to the client (same generic response either
      // way) — but do surface it server-side so a misconfigured SMTP setup
      // is diagnosable instead of silently swallowed.
      console.error("[forgot-password] failed to send reset email:", err);
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
