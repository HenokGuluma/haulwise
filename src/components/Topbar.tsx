"use client";

import { usePathname } from "next/navigation";
import { IconButton, Button } from "@/components/ui";

const VIEW_META: Record<string, { title: string; sub: string }> = {
  "/dashboard": { title: "Dashboard", sub: "Today's operational overview" },
  "/board": { title: "Dispatch Board", sub: "Drag loads between stages to update status" },
  "/loads": { title: "Loads", sub: "Every load, searchable and filterable" },
  "/roster": { title: "Drivers & Equipment", sub: "Manage your fleet and roster" },
  "/documents": { title: "Documents & Billing", sub: "Attachments, driver pay, and payout status" },
};

export function Topbar({ onNewLoad }: { onNewLoad: () => void }) {
  const pathname = usePathname() || "/dashboard";
  const meta = VIEW_META[pathname] ?? { title: "Haulwise", sub: "" };

  return (
    <div className="topbar">
      <div>
        <div className="topbar-title">{meta.title}</div>
        <div className="topbar-sub">{meta.sub}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        <Button variant="primary" icon="plus" onClick={onNewLoad}>New Load</Button>
      </div>
    </div>
  );
}
