"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Autofocus is a nice desktop shortcut but pops the keyboard immediately
  // on mobile before the user has even seen the page — only do it for
  // pointer-based (non-touch) devices.
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      emailRef.current?.focus();
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // A hard disconnect rejects the fetch promise (caught below), but a slow
    // or lossy connection can leave it pending indefinitely with no error —
    // without this, the button would stay stuck on "Signing in…" forever.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      const defaultHome = data.user?.isCustomerScoped ? "/loads" : "/dashboard";
      const next = searchParams.get("next") || defaultHome;
      router.push(next);
      router.refresh();
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

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          ref={emailRef}
          className="input"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="field">
        <div className="field-label-row">
          <label htmlFor="login-password">Password</label>
          <a href="/forgot-password" className="auth-text-link">Forgot password?</a>
        </div>
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          enterKeyHint="go"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <div className="banner banner-danger" role="alert" style={{ marginBottom: 14 }}>
          {error}
        </div>
      )}
      <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
