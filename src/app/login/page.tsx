import { Suspense } from "react";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Icon } from "@/components/ui";
import { BrandMark } from "@/components/BrandMark";

export const metadata: Metadata = { title: "Sign In" };

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
            <div className="auth-lockup">
              <BrandMark size={52} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="auth-lockup-wordmark" src="/cober-text.jpg" alt="Cober Freight" />
            </div>
            <div className="auth-wordmark-tag">Dispatch · Deliver · Depend</div>
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
          <div className="auth-form-brand">
            <div className="auth-lockup auth-lockup-sm">
              <BrandMark size={36} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="auth-lockup-wordmark" src="/cober-text.jpg" alt="Cober Freight" />
            </div>
          </div>
          <div className="auth-form-header">
            <div className="auth-form-title">Welcome back</div>
            <div className="auth-form-sub">Sign in to your dispatch workspace.</div>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
