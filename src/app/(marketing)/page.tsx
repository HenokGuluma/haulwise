import Image from "next/image";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { Icon } from "@/components/ui";

const POINTS = [
  { icon: "route", text: "Follow every load from assignment to delivery" },
  { icon: "fileText", text: "BOLs, PODs and rate confirmations in one place" },
  { icon: "download", text: "Download invoices as ready-to-send PDFs" },
];

export default async function HomePage() {
  // The layout already reads the session for the nav; reading it here too
  // keeps this page's button in sync without prop-drilling through the layout.
  const user = await getSessionUser();

  return (
    <main className="lp-hero">
      <Image src="/landing/hero-highway.jpg" alt="" fill priority sizes="100vw" quality={60} className="lp-hero-photo" />
      <div className="lp-hero-inner">
        <span className="lp-eyebrow">Customer & dispatch portal</span>
        <h1>
          Your loads, statuses and paperwork, <span>in one place.</span>
        </h1>
        <p className="lp-lead">
          Sign in to see where your cargo is, download your documents and keep track of every invoice.
        </p>

        <div className="lp-actions">
          {user ? (
            <Link href="/dashboard" className="lp-btn lp-btn-lg">
              Go to dashboard <Icon name="arrowRight" size={18} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="lp-btn lp-btn-lg">
                Log in <Icon name="arrowRight" size={18} />
              </Link>
              <Link href="/forgot-password" className="lp-link">Forgot your password?</Link>
            </>
          )}
        </div>

        <ul className="lp-points">
          {POINTS.map((p) => (
            <li key={p.text}>
              <Icon name={p.icon} size={18} />
              {p.text}
            </li>
          ))}
        </ul>

        <p className="lp-note">
          Not a customer yet? <a href="https://coberfreight.com.et/quote">Request a quote</a>. Portal access
          comes with your first booked load.
        </p>
      </div>
    </main>
  );
}
