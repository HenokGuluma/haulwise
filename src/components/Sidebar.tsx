"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { BrandMark } from "@/components/BrandMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fullName } from "@/lib/format";
import { api } from "@/lib/api-client";
import { onDataChange } from "@/lib/data-events";
import type { SessionUser } from "@/types";

type NavItem = { href: string; label: string; icon: string; requiredPermission?: string; showIf?: (user: SessionUser) => boolean };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid", requiredPermission: "dashboard:view" },
  {
    href: "/board",
    label: "Dispatch Board",
    icon: "columns",
    // Internal roles need loads:assign — it's a drag-and-drop assignment
    // tool there, so a view-only role like Accountant shouldn't see it. A
    // customer-scoped role gets a read-only status board instead, gated on
    // loads:view (no assignment capability applies to them at all).
    showIf: (u) => (u.isCustomerScoped ? u.permissions.includes("loads:view") : u.permissions.includes("loads:assign")),
  },
  { href: "/loads", label: "Loads", icon: "list" },
  { href: "/customers", label: "Customers", icon: "briefcase", requiredPermission: "customers:view" },
  { href: "/roster", label: "Drivers & Equipment", icon: "users", requiredPermission: "roster:view" },
  { href: "/documents", label: "Documents & Billing", icon: "fileText", requiredPermission: "documents:view" },
  { href: "/roles", label: "Roles", icon: "shield", requiredPermission: "roles:manage" },
  { href: "/users", label: "Users", icon: "userCog", requiredPermission: "users:view" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar({
  user,
  counts,
  mobileOpen = false,
  onCloseMobile,
}: {
  user: SessionUser;
  counts: Partial<Record<string, number>>;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // The server-computed `counts` prop is only fresh at the last full
  // navigation/router.refresh() — a layout doesn't re-run on client-side
  // navigation between sibling pages, so a load/driver/equipment created
  // or deleted from deep inside some other page's own component tree
  // (not every mutation path calls router.refresh()) would otherwise
  // leave these badges stale until the next one. Re-pulls just the counts
  // (a few COUNT queries, never row data) whenever one of those entities
  // actually changes, instead of polling or over-fetching everything.
  const [liveCounts, setLiveCounts] = useState(counts);
  useEffect(() => setLiveCounts(counts), [counts]);
  useEffect(() => {
    function refetch() {
      api.get<Partial<Record<string, number>>>("/api/nav-counts").then(setLiveCounts).catch(() => {});
    }
    const unsubs = [onDataChange("loads", refetch), onDataChange("drivers", refetch), onDataChange("equipment", refetch)];
    return () => unsubs.forEach((u) => u());
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className={"sidebar" + (mobileOpen ? " open" : "")}>
      <div className="brand">
        <BrandMark size={46} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-wordmark" src="/cober-text-light.png" alt="Cober Freight" />
        <button className="sidebar-close" onClick={onCloseMobile} aria-label="Close menu" title="Close menu">
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="nav-group">
        {NAV_ITEMS.filter((item) => (item.showIf ? item.showIf(user) : !item.requiredPermission || user.permissions.includes(item.requiredPermission))).map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const count = liveCounts[item.href];
          return (
            <Link key={item.href} href={item.href} className={"nav-item" + (active ? " active" : "")} onClick={onCloseMobile}>
              <Icon name={item.icon} />
              {item.label}
              {count !== undefined && <span className="nav-count">{count}</span>}
            </Link>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="role-avatar">{user.roleName.slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="role-name">{fullName(user.firstName, user.lastName)}</div>
          <div style={{ fontSize: 10.5, color: "var(--navy-ink-muted)" }}>{user.roleName}</div>
        </div>
        <ThemeToggle />
        <IconButtonInline onClick={signOut} />
      </div>
    </div>
  );
}

function IconButtonInline({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Sign out"
      aria-label="Sign out"
      style={{ background: "none", border: "none", color: "var(--navy-ink-muted)", cursor: "pointer", display: "flex", padding: 4 }}
    >
      <Icon name="logOut" size={16} />
    </button>
  );
}
