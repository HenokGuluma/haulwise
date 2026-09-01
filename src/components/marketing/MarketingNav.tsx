"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/guide", label: "Guide" },
  { href: "/contact", label: "Contact" },
];

export function MarketingNav({ loggedIn }: { loggedIn: boolean }) {
  const pathname = usePathname();

  return (
    <div className="mkt-nav">
      <Link href="/" className="mkt-nav-brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.png" alt="" width={26} height={26} style={{ objectFit: "contain" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cober-text-light.png" alt="Cober Freight" />
      </Link>

      <div className="mkt-nav-links">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={"mkt-nav-link" + (pathname === l.href ? " active" : "")}>
            {l.label}
          </Link>
        ))}
      </div>

      <div className="mkt-nav-right">
        <Link href={loggedIn ? "/dashboard" : "/login"} className="btn btn-primary btn-sm">
          {loggedIn ? "Go to Dashboard" : "Login"}
        </Link>
      </div>
    </div>
  );
}
