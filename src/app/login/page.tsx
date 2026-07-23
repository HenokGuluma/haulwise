import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--navy)",
        backgroundImage: "linear-gradient(180deg, var(--navy) 0%, var(--navy-grad-end) 100%)",
      }}
    >
      <div
        className="card"
        style={{ width: 380, maxWidth: "92vw", padding: 32, background: "var(--surface)" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="22" style={{ fill: "var(--amber)" }} />
            <path
              d="M20 62h8V40h20l10 12v10h8"
              style={{ stroke: "var(--navy)" }}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="36" cy="66" r="6" style={{ fill: "var(--navy)" }} />
            <circle cx="62" cy="66" r="6" style={{ fill: "var(--navy)" }} />
          </svg>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "var(--font-heading)", letterSpacing: "-0.025em", color: "var(--ink)" }}>Haulwise</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Dispatch
            </div>
          </div>
        </div>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>

        <div style={{ marginTop: 18, fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
          Demo accounts (seeded locally):
          <br />
          <span className="mono">admin@haulwise.local</span> / <span className="mono">admin123</span> (Admin)
          <br />
          <span className="mono">dispatcher@haulwise.local</span> / <span className="mono">dispatch123</span> (Dispatcher)
        </div>
      </div>
    </div>
  );
}
