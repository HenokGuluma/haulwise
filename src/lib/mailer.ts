// Outbound email, behind the same kind of driver abstraction as
// src/lib/storage.ts. Three drivers, picked by which env vars are set:
//   - RESEND_API_KEY: sends via Resend's HTTP API (preferred when using
//     Resend — its SMTP relay has been unreliable for a verified domain
//     while the HTTP API sends the same message without issue).
//   - SMTP_HOST (+ SMTP_PORT/SMTP_USER/SMTP_PASS/SMTP_FROM): any other
//     SMTP provider (a Gmail app password, Ethio Telecom's own email
//     hosting, etc).
//   - Neither: mail is logged to the server console instead of sent —
//     safe default for local dev, and lets the reset flow be exercised
//     end-to-end before real credentials are wired up.
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

class ResendApiMailer implements MailDriver {
  async send(message: MailMessage): Promise<void> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.SMTP_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API send failed (${res.status}): ${body}`);
    }
  }
}

let driver: MailDriver | null = null;

export function getMailer(): MailDriver {
  if (!driver) {
    driver = process.env.RESEND_API_KEY
      ? new ResendApiMailer()
      : process.env.SMTP_HOST
        ? new SmtpMailer()
        : new ConsoleMailer();
  }
  return driver;
}
