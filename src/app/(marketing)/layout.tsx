import { getSessionUser } from "@/lib/auth";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="lp-page">
      <MarketingNav loggedIn={!!user} />
      {children}
      <MarketingFooter />
    </div>
  );
}
