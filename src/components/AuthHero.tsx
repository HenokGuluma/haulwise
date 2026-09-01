import { Icon } from "@/components/ui";
import { BrandMark } from "@/components/BrandMark";

const FEATURES = [
  { icon: "route", title: "Dispatch Board", desc: "Drag-and-drop loads through your pipeline in real time." },
  { icon: "truck", title: "Fleet & Roster", desc: "Track drivers, equipment, and maintenance in one place." },
  { icon: "fileText", title: "Documents & Billing", desc: "BOLs, PODs, rate confirmations, and payouts — organized." },
];

/** Shared left-hand hero panel for the login / forgot-password / reset-password pages. */
export function AuthHero() {
  return (
    <div className="auth-hero">
      <div className="auth-hero-glow" />
      <div className="auth-hero-content">
        <div className="auth-brand">
          <div className="auth-brand-row">
            <BrandMark size={70} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="auth-wordmark-img" src="/cober-text-light.png" alt="Cober Freight" />
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
  );
}

/** Shared small brand lockup shown atop the form panel on mobile (hero is hidden there). */
export function AuthFormBrand() {
  return (
    <div className="auth-form-brand">
      <BrandMark size={38} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="auth-wordmark-img auth-wordmark-img-sm" src="/cober-text-light.png" alt="Cober Freight" />
    </div>
  );
}
