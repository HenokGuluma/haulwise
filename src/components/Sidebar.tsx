"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fullName } from "@/lib/format";
import type { SessionUser } from "@/types";

type NavItem = { href: string; label: string; icon: string; requiredPermission?: string };

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid", requiredPermission: "dashboard:view" },
  // Gated on loads:assign (not loads:view) so a view-only role (e.g.
  // Accountant) doesn't see a dispatch board whose drag actions it can't
  // perform.
  { href: "/board", label: "Dispatch Board", icon: "columns", requiredPermission: "loads:assign" },
  { href: "/loads", label: "Loads", icon: "list" },
  { href: "/customers", label: "Customers", icon: "briefcase", requiredPermission: "customers:view" },
  { href: "/roster", label: "Drivers & Equipment", icon: "users", requiredPermission: "roster:view" },
  { href: "/documents", label: "Documents & Billing", icon: "fileText", requiredPermission: "documents:view" },
  { href: "/roles", label: "Roles", icon: "shield", requiredPermission: "roles:manage" },
  { href: "/users", label: "Users", icon: "shield", requiredPermission: "users:view" },
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

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className={"sidebar" + (mobileOpen ? " open" : "")}>
      <div className="brand">
        <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
          <rect width="100" height="100" rx="22" style={{ fill: "var(--amber)" }} />
          <path d="M20 62h8V40h20l10 12v10h8" style={{ stroke: "var(--navy)" }} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="36" cy="66" r="6" style={{ fill: "var(--navy)" }} />
          <circle cx="62" cy="66" r="6" style={{ fill: "var(--navy)" }} />
        </svg>
        <div>
          <div className="brand-name">Edget</div>
          <div className="brand-sub">Dispatch</div>
        </div>
        <button className="sidebar-close" onClick={onCloseMobile} aria-label="Close menu" title="Close menu">
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="nav-group">
        {NAV_ITEMS.filter((item) => !item.requiredPermission || user.permissions.includes(item.requiredPermission)).map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const count = counts[item.href];
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
