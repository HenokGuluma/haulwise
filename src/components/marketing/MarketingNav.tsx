import Link from "next/link";
import Image from "next/image";

// Logo plus a single action. The landing page is the whole public site,
// so there is nothing else to navigate to.
export function MarketingNav({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="lp-nav">
      <Link href="/" className="lp-logo" aria-label="Cober Freight, home">
        <Image src="/logo-mark-light.png" alt="" width={224} height={160} priority className="lp-logo-mark" />
        <span className="lp-logo-word" aria-hidden="true">
          <span>Cober</span> Freight
        </span>
      </Link>
      <Link href={loggedIn ? "/dashboard" : "/login"} className="lp-btn lp-btn-sm">
        {loggedIn ? "Go to dashboard" : "Log in"}
      </Link>
    </header>
  );
}
