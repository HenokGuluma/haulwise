"use client";

import { useState } from "react";
import { Field, ModalBox, PanelHead, Button } from "@/components/ui";
import { PERMISSION_CATALOG } from "@/lib/permissions";
import { api, ApiRequestError } from "@/lib/api-client";
import type { RoleRow } from "@/types";

export function RoleFormModal({
  role,
  onClose,
  onSaved,
}: {
  role?: RoleRow;
  onClose: () => void;
  onSaved: (role: RoleRow) => void;
}) {
  const isEdit = !!role;
  const [form, setForm] = useState({
    name: role?.name ?? "",
    isCustomerScoped: role?.isCustomerScoped ?? false,
    permissions: role?.permissions ?? [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggle(key: string) {
    set("permissions", form.permissions.includes(key) ? form.permissions.filter((p) => p !== key) : [...form.permissions, key]);
  }

  function toggleCategory(keys: string[], allSelected: boolean) {
    set("permissions", allSelected ? form.permissions.filter((p) => !keys.includes(p)) : [...new Set([...form.permissions, ...keys])]);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    const payload = { name: form.name.trim(), isCustomerScoped: form.isCustomerScoped, permissions: form.permissions };
    try {
      if (isEdit && role) {
        const res = await api.patch<{ role: RoleRow }>(`/api/roles/${role.id}`, payload);
        onSaved(res.role);
      } else {
        const res = await api.post<{ role: RoleRow }>("/api/roles", payload);
        onSaved(res.role);
      }
    } catch (err) {
      setServerError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalBox onClose={onClose} width={520}>
      <PanelHead title={isEdit ? "Edit Role" : "Add Role"} onClose={onClose} />
      <div className="panel-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {serverError && <div className="banner banner-danger" style={{ marginBottom: 14 }}>{serverError}</div>}

        <Field label="Name" error={errors.name}>
          <input className={"input" + (errors.name ? " err" : "")} placeholder="e.g. Warehouse Lead" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={60} />
        </Field>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "10px 0 16px", borderBottom: "1px solid var(--line-soft)", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>Customer-scoped portal login</div>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
              Users with this role must be linked to a customer and will only see that customer&apos;s own loads and documents — nothing fleet-wide.
            </p>
          </div>
          <label className="switch" title={form.isCustomerScoped ? "Turn off" : "Turn on"}>
            <input type="checkbox" checked={form.isCustomerScoped} onChange={(e) => set("isCustomerScoped", e.target.checked)} />
            <span className="switch-track" />
          </label>
        </div>

        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 8 }}>Permissions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {PERMISSION_CATALOG.map((group) => {
            const keys = group.items.map((i) => i.key);
            const allSelected = keys.every((k) => form.permissions.includes(k));
            return (
              <div key={group.category}>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>{group.category}</span>
                  <button
                    type="button"
                    className="doc-slot-history-toggle"
                    style={{ marginLeft: "auto" }}
                    onClick={() => toggleCategory(keys, allSelected)}
                  >
                    {allSelected ? "Clear all" : "Select all"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {group.items.map((item) => (
                    <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                      <input type="checkbox" checked={form.permissions.includes(item.key)} onChange={() => toggle(item.key)} />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add role"}
        </Button>
      </div>
    </ModalBox>
  );
}
