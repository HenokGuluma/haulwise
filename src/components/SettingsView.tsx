"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, useToast } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";
import type { SessionUser } from "@/types";

export function SettingsView({ user }: { user: SessionUser }) {
  const [showMockData, setShowMockData] = useState(user.showMockData);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function toggle() {
    const next = !showMockData;
    setShowMockData(next);
    setSaving(true);
    try {
      await api.patch<{ showMockData: boolean }>("/api/me/preferences", { showMockData: next });
      toast.success(next ? "Demo data is now visible." : "Demo data is now hidden.");
      router.refresh();
    } catch (err) {
      setShowMockData(!next);
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't update this setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="section-title">
          <span className="section-title-icon" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
            <Icon name="briefcase" size={16} />
          </span>
          Account
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
            <span style={{ color: "var(--muted)" }}>Name</span>
            <span style={{ fontWeight: 600 }}>{user.name}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
            <span style={{ color: "var(--muted)" }}>Email</span>
            <span style={{ fontWeight: 600 }}>{user.email}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ color: "var(--muted)" }}>Role</span>
            <span style={{ fontWeight: 600 }}>{user.role === "ADMIN" ? "Admin" : "Dispatcher"}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="section-title">
          <span className="section-title-icon" style={{ background: "var(--purple-bg)", color: "var(--purple)" }}>
            <Icon name="database" size={16} />
          </span>
          Demo data
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Show demo data</div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
              Edget can be pre-populated with a large set of realistic sample customers, drivers,
              equipment, and loads spanning three years of operations — useful for exploring every
              feature (including the dashboard charts) without real data. When this is off, demo
              rows are hidden everywhere: the dispatch board, loads, customers, roster, documents,
              and dashboard all show only your real, ordinary data.
            </p>
          </div>
          <label className="switch" title={showMockData ? "Turn off demo data" : "Turn on demo data"}>
            <input type="checkbox" checked={showMockData} disabled={saving} onChange={toggle} />
            <span className="switch-track" />
          </label>
        </div>
      </div>
    </div>
  );
}
