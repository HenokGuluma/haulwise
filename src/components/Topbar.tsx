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
  "/settings": { title: "Settings", sub: "Account preferences and demo data" },
};

export function Topbar({ onNewLoad, onMenuClick }: { onNewLoad: () => void; onMenuClick: () => void }) {
  const pathname = usePathname() || "/dashboard";
  const meta = VIEW_META[pathname] ?? { title: "Edget", sub: "" };

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
        <Button variant="primary" icon="plus" onClick={onNewLoad} title="New Load" aria-label="New Load">
          <span className="btn-label-collapsible">New Load</span>
        </Button>
      </div>
    </div>
  );
}
