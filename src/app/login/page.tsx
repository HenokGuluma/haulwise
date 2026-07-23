import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Icon } from "@/components/ui";

const FEATURES = [
  { icon: "route", title: "Dispatch Board", desc: "Drag-and-drop loads through your pipeline in real time." },
  { icon: "truck", title: "Fleet & Roster", desc: "Track drivers, equipment, and maintenance in one place." },
  { icon: "fileText", title: "Documents & Billing", desc: "BOLs, PODs, rate confirmations, and payouts — organized." },
];

export default function LoginPage() {
  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="auth-hero-glow" />
        <div className="auth-hero-content">
          <div className="auth-brand">
            <svg width="36" height="36" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" rx="22" style={{ fill: "var(--amber)" }} />
              <path d="M20 62h8V40h20l10 12v10h8" style={{ stroke: "var(--navy)" }} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="36" cy="66" r="6" style={{ fill: "var(--navy)" }} />
              <circle cx="62" cy="66" r="6" style={{ fill: "var(--navy)" }} />
            </svg>
            <span className="auth-brand-name">Haulwise</span>
          </div>

          <h1 className="hero-title auth-hero-title">
            Freight dispatch,<br />running like clockwork.
          </h1>
          <p className="auth-hero-sub">
            The operational hub for dispatchers — loads, roster, documents, and billing,
            built for how freight teams actually work.
          </p>

          <div className="auth-features">
            {FEATURES.map((f) => (
              <div key={f.title} className="auth-feature">
                <span className="auth-feature-icon"><Icon name={f.icon} size={17} /></span>
                <div>
                  <div className="auth-feature-title">{f.title}</div>
                  <div className="auth-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-route-motif" aria-hidden="true">
            <div className="auth-route-track" />
            <span className="auth-route-node start" />
            <span className="auth-route-node mid" />
            <span className="auth-route-node end" />
            <span className="auth-route-truck"><Icon name="truck" size={16} /></span>
          </div>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-form-header">
            <div className="auth-form-title">Welcome back</div>
            <div className="auth-form-sub">Sign in to your dispatch workspace.</div>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <div className="auth-demo-hint">
            <div className="auth-demo-hint-label">Demo accounts (seeded locally)</div>
            <div><span className="mono">admin@haulwise.local</span> / <span className="mono">admin123</span> — Admin</div>
            <div><span className="mono">dispatcher@haulwise.local</span> / <span className="mono">dispatch123</span> — Dispatcher</div>
          </div>
        </div>
      </div>
    </div>
  );
}
