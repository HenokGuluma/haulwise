"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import type { SessionUser } from "@/types";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/board", label: "Dispatch Board", icon: "columns" },
  { href: "/loads", label: "Loads", icon: "list" },
  { href: "/roster", label: "Drivers & Equipment", icon: "users" },
  { href: "/documents", label: "Documents & Billing", icon: "fileText" },
] as const;

export function Sidebar({
  user,
  counts,
}: {
  user: SessionUser;
  counts: Partial<Record<(typeof NAV_ITEMS)[number]["href"], number>>;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="sidebar">
      <div className="brand">
        <svg width="30" height="30" viewBox="0 0 100 100" fill="none">
          <rect width="100" height="100" rx="22" fill="#F5A623" />
          <path d="M20 62h8V40h20l10 12v10h8" stroke="#131B2E" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="36" cy="66" r="6" fill="#131B2E" />
          <circle cx="62" cy="66" r="6" fill="#131B2E" />
        </svg>
        <div>
          <div className="brand-name">Haulwise</div>
          <div className="brand-sub">Dispatch</div>
        </div>
      </div>

      <div className="nav-group">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const count = counts[item.href];
          return (
            <Link key={item.href} href={item.href} className={"nav-item" + (active ? " active" : "")}>
              <Icon name={item.icon} />
              {item.label}
              {count !== undefined && <span className="nav-count">{count}</span>}
            </Link>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="role-avatar">{user.role === "ADMIN" ? "AD" : "DS"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="role-name">{user.name}</div>
          <div style={{ fontSize: 10.5, color: "#7C8AB0" }}>{user.role === "ADMIN" ? "Admin" : "Dispatcher"}</div>
        </div>
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
      style={{ background: "none", border: "none", color: "#7C8AB0", cursor: "pointer", display: "flex", padding: 4 }}
    >
      <Icon name="logOut" size={16} />
    </button>
  );
}
