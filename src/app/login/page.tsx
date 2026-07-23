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
        backgroundImage: "linear-gradient(180deg, var(--navy) 0%, #10162A 100%)",
      }}
    >
      <div
        className="card"
        style={{ width: 380, maxWidth: "92vw", padding: 32, background: "#fff" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="22" fill="#F5A623" />
            <path
              d="M20 62h8V40h20l10 12v10h8"
              stroke="#131B2E"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="36" cy="66" r="6" fill="#131B2E" />
            <circle cx="62" cy="66" r="6" fill="#131B2E" />
          </svg>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Haulwise</div>
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
