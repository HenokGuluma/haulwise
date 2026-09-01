import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Guide" };

const STEPS = [
  {
    num: "01",
    title: "Manage the Dispatch Board",
    desc: "Every load moves through Draft, Assigned, In Transit, and Delivered. Drag a card to the next stage, or assign a driver and equipment directly — once linked, the load carries that assignment automatically.",
    img: "/guide/board.png",
  },
  {
    num: "02",
    title: "See the fleet at a glance",
    desc: "The dashboard shows active loads, what's in transit, and revenue for the period you pick — this week, this month, or this year — so you know where things stand without digging through records.",
    img: "/guide/dashboard.png",
  },
  {
    num: "03",
    title: "Keep documents and billing together",
    desc: "BOLs, PODs, and rate confirmations attach right to the load. Payout status is tracked alongside, so nothing gets billed — or paid — without the paperwork to back it up.",
    img: "/guide/documents.png",
  },
];

export default function GuidePage() {
  return (
    <>
      <section className="mkt-hero" style={{ padding: "70px 40px 50px" }}>
        <span className="mkt-eyebrow">Guide</span>
        <h1 style={{ fontSize: 36 }}>How the platform works</h1>
        <p className="mkt-hero-sub">A quick walkthrough of the core screens dispatchers use every day.</p>
      </section>

      <section className="mkt-section" style={{ paddingTop: 0 }}>
        <div className="mkt-steps">
          {STEPS.map((s, i) => (
            <div key={s.num} className={"mkt-step" + (i % 2 === 1 ? " reverse" : "")}>
              <div>
                <div className="mkt-step-num">{s.num}</div>
                <div className="mkt-step-title">{s.title}</div>
                <div className="mkt-step-desc">{s.desc}</div>
              </div>
              <div className="mkt-step-media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.img} alt={s.title} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mkt-cta-band">
        <h2>Ready to try it yourself?</h2>
        <p>Sign in with your Cober Freight account to get started.</p>
        <Link href="/login" className="btn btn-primary">Login to the platform</Link>
      </div>
    </>
  );
}
