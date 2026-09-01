import Link from "next/link";
import { Icon } from "@/components/ui";

const FEATURES = [
  { icon: "route", title: "Dispatch Board", desc: "Drag loads through every stage of the pipeline — driver and equipment stay linked automatically once assigned." },
  { icon: "users", title: "Fleet & Roster", desc: "Drivers, trucks, trailers, and maintenance schedules, all tracked in one place." },
  { icon: "fileText", title: "Documents & Billing", desc: "BOLs, PODs, and rate confirmations attached right on the load — payouts tracked alongside." },
  { icon: "trendingUp", title: "Live Reporting", desc: "Revenue, volume, and status breakdowns that update as your team works, not once a week." },
  { icon: "shield", title: "Role-Based Access", desc: "Dispatchers, accountants, and customers each see exactly what's relevant to them — nothing more." },
  { icon: "download", title: "Real Paperwork", desc: "Dispatch papers and invoices generate as real, ready-to-send PDFs, straight from the load." },
];

export default function HomePage() {
  return (
    <>
      <section className="mkt-hero">
        <div className="mkt-hero-glow" />
        <h1>Cober Freight Dispatch</h1>
        <div className="mkt-hero-tagline">Freight dispatch, running like clockwork.</div>
        <p className="mkt-hero-sub">
          The operational hub behind Cober Freight — loads, roster, documents, and billing, built for how
          freight teams actually work day to day.
        </p>
        <div className="mkt-hero-actions">
          <Link href="/login" className="btn btn-primary">Login to the platform</Link>
          <Link href="/guide" className="btn btn-ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.18)" }}>See how it works</Link>
        </div>
      </section>

      <section className="mkt-section">
        <div className="mkt-section-head">
          <div className="mkt-section-title">Everything dispatch needs, in one place</div>
          <div className="mkt-section-sub">A single system for the whole load lifecycle — from quote to paid invoice.</div>
        </div>
        <div className="mkt-grid-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="mkt-card">
              <span className="mkt-card-icon"><Icon name={f.icon} size={19} /></span>
              <div className="mkt-card-title">{f.title}</div>
              <div className="mkt-card-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="mkt-cta-band">
        <h2>Ready to dispatch?</h2>
        <p>Sign in with your Cober Freight account to get to work.</p>
        <Link href="/login" className="btn btn-primary">Login to the platform</Link>
      </div>
    </>
  );
}
