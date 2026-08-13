"use client";

import { usePathname } from "next/navigation";
import { Button, Icon } from "@/components/ui";

const VIEW_META: Record<string, { title: string; sub: string }> = {
  "/dashboard": { title: "Dashboard", sub: "Today's operational overview" },
  "/board": { title: "Dispatch Board", sub: "Drag loads between stages to update status" },
  "/loads": { title: "Loads", sub: "Every load, searchable and filterable" },
  "/customers": { title: "Customers", sub: "Accounts, contacts, and load history" },
  "/roster": { title: "Drivers & Equipment", sub: "Manage your fleet and roster" },
  "/documents": { title: "Documents & Billing", sub: "Attachments, driver pay, and payout status" },
  "/roles": { title: "Roles", sub: "Define what each role can see and do" },
  "/users": { title: "Users", sub: "Team members and their assigned role" },
  "/settings": { title: "Settings", sub: "Account preferences and demo data" },
};

// /customers/[id] isn't in the exact-match map above since its path is
// dynamic — matched by prefix instead. The customer's own name already
// appears prominently in the page body below, so a generic heading here
// (matching how every other detail-style page behaves) is enough.
function resolveViewMeta(pathname: string): { title: string; sub: string } {
  if (VIEW_META[pathname]) return VIEW_META[pathname];
  if (pathname.startsWith("/customers/")) return { title: "Customer Details", sub: "Account overview and load history" };
  return { title: "Cober Freight", sub: "" };
}

export function Topbar({
  onNewLoad,
  onMenuClick,
  showNewLoad = true,
  showSearch = true,
}: {
  onNewLoad: () => void;
  onMenuClick: () => void;
  showNewLoad?: boolean;
  showSearch?: boolean;
}) {
  const pathname = usePathname() || "/dashboard";
  const meta = resolveViewMeta(pathname);

  return (
    <div className="topbar">
      <button type="button" className="topbar-menu-btn" onClick={onMenuClick} aria-label="Open menu" title="Open menu">
        <Icon name="list" size={18} />
      </button>
      <div className="topbar-heading">
        <div className="topbar-title">{meta.title}</div>
        <div className="topbar-sub">{meta.sub}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
        {showSearch && (
          <button
            type="button"
            className="topbar-search-trigger"
            onClick={() => window.dispatchEvent(new Event("haulwise:open-command-palette"))}
            title="Search everything (Cmd/Ctrl+K)"
            aria-label="Search everything"
          >
            <Icon name="search" size={14} />
            <span className="topbar-search-label">Search loads, drivers, customers…</span>
            <kbd className="cmdk-esc">⌘K</kbd>
          </button>
        )}
        {showNewLoad && (
          <Button variant="primary" icon="plus" onClick={onNewLoad} title="New Load" aria-label="New Load">
            <span className="btn-label-collapsible">New Load</span>
          </Button>
        )}
      </div>
    </div>
  );
}
