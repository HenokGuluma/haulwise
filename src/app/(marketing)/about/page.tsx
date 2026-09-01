import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui";

export const metadata: Metadata = { title: "About" };

const VALUES = [
  { icon: "checkCircle", title: "Reliability", desc: "A load that's committed to gets picked up, tracked, and delivered — every time, no surprises." },
  { icon: "zap", title: "Speed", desc: "Dispatch decisions happen in real time, not over a phone tree at the end of the day." },
  { icon: "shield", title: "Accountability", desc: "Every load has a paper trail — who assigned it, what it moved, what it was billed and paid." },
];

export default function AboutPage() {
  return (
    <section className="mkt-section mkt-content" style={{ maxWidth: 760 }}>
      <div style={{ marginBottom: 44 }}>
        <h1 style={{ fontSize: 32, marginBottom: 14 }}>About Cober Freight</h1>
        <p>
          Cober Freight moves freight across Ethiopia — connecting shippers who need cargo delivered with the
          drivers and equipment that get it there. Our dispatch platform is the operational backbone behind
          that: every load, every driver assignment, and every document, tracked from pickup to payment.
        </p>
        <p style={{ marginTop: 14 }}>
          We built this system because freight dispatch shouldn&apos;t run on scattered spreadsheets and phone
          calls. A dispatcher should be able to see the whole fleet at a glance, assign a load in a couple of
          clicks, and trust that the paperwork — BOLs, PODs, invoices — is organized and accounted for without
          extra effort.
        </p>
      </div>

      <h2 style={{ fontSize: 20, marginBottom: 18 }}>What we care about</h2>
      <div className="mkt-grid-3" style={{ marginBottom: 44 }}>
        {VALUES.map((v) => (
          <div key={v.title} className="mkt-card">
            <span className="mkt-card-icon"><Icon name={v.icon} size={19} /></span>
            <div className="mkt-card-title">{v.title}</div>
            <div className="mkt-card-desc">{v.desc}</div>
          </div>
        ))}
      </div>

      <div className="mkt-cta-band" style={{ margin: 0 }}>
        <h2>Ready to dispatch?</h2>
        <p>Sign in with your Cober Freight account to get to work.</p>
        <Link href="/login" className="btn btn-primary">Login to the platform</Link>
      </div>
    </section>
  );
}
