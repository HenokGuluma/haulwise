import Link from "next/link";

export function MarketingFooter() {
  return (
    <div className="mkt-footer">
      <div className="mkt-footer-inner">
        <div className="mkt-footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.png" alt="" width={20} height={20} style={{ objectFit: "contain" }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cober-text-light.png" alt="Cober Freight" />
        </div>
        <div className="mkt-footer-links">
          <Link href="/about">About</Link>
          <Link href="/guide">Guide</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/login">Login</Link>
        </div>
        <div className="mkt-footer-copy">© {new Date().getFullYear()} Cober Freight. All rights reserved.</div>
      </div>
    </div>
  );
}
