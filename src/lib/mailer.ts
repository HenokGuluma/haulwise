// Outbound email, behind the same kind of driver abstraction as
// src/lib/storage.ts. Selected via SMTP_HOST — set it (plus SMTP_PORT/
// SMTP_USER/SMTP_PASS/SMTP_FROM) to send real email through any SMTP
// provider (a Gmail app password, Ethio Telecom's own email hosting, a
// transactional provider's SMTP relay — all speak the same protocol, so
// no code change is needed to switch providers). Without it, mail is
// logged to the server console instead of sent — safe default for local
// dev, and lets the reset flow be exercised end-to-end before real SMTP
// credentials are wired up.
import nodemailer from "nodemailer";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailDriver {
  send(message: MailMessage): Promise<void>;
}

class ConsoleMailer implements MailDriver {
  async send(message: MailMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(
      `[mailer] SMTP not configured — logging instead of sending.\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`
    );
  }
}

class SmtpMailer implements MailDriver {
  async send(message: MailMessage): Promise<void> {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
  }
}

let driver: MailDriver | null = null;

export function getMailer(): MailDriver {
  if (!driver) {
    driver = process.env.SMTP_HOST ? new SmtpMailer() : new ConsoleMailer();
  }
  return driver;
}
