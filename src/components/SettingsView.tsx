"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, useToast } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";
import type { SessionUser } from "@/types";

export function SettingsView({ user }: { user: SessionUser }) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [savingName, setSavingName] = useState(false);
  const [showMockData, setShowMockData] = useState(user.showMockData);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const nameDirty = firstName.trim() !== user.firstName || lastName.trim() !== user.lastName;

  async function saveName() {
    if (!firstName.trim()) {
      toast.error("First name is required.");
      return;
    }
    setSavingName(true);
    try {
      await api.patch("/api/me/preferences", { firstName: firstName.trim(), lastName: lastName.trim() });
      toast.success("Name updated.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't update your name.");
    } finally {
      setSavingName(false);
    }
  }

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
          <div style={{ padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
            <div style={{ color: "var(--muted)", marginBottom: 8 }}>Name</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 140 }}
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <input
                className="input"
                style={{ flex: 1, minWidth: 140 }}
                placeholder="Last name (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              {nameDirty && (
                <Button variant="primary" size="sm" onClick={saveName} loading={savingName}>
                  Save
                </Button>
              )}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}>
            <span style={{ color: "var(--muted)" }}>Email</span>
            <span style={{ fontWeight: 600 }}>{user.email}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
            <span style={{ color: "var(--muted)" }}>Role</span>
            <span style={{ fontWeight: 600 }}>{user.roleName}</span>
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
