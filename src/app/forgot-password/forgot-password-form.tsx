"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // A stalled (not failed) request on a slow connection never rejects on
    // its own, which would leave the button stuck disabled indefinitely.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      setSent(true);
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "That's taking too long. Check your connection and try again."
          : "Couldn't reach the server. Check your connection and try again."
      );
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="banner banner-success" style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 13.5 }}>
          <Icon name="mail" size={15} />
          Check your inbox
        </div>
        <div style={{ lineHeight: 1.5 }}>
          If an account exists for <strong>{email}</strong>, we&apos;ve emailed a link to reset your password. It expires in 1 hour.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Email</label>
        <input
          className="input"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && (
        <div className="banner banner-danger" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}
      <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
