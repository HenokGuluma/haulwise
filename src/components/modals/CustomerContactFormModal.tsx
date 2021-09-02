"use client";

import { useState } from "react";
import { Field, ModalBox, PanelHead, Button } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";
import type { CustomerContact } from "@/types";

export function CustomerContactFormModal({
  customerId,
  contact,
  onClose,
  onSaved,
}: {
  customerId: string;
  contact?: CustomerContact;
  onClose: () => void;
  onSaved: (contact: CustomerContact) => void;
}) {
  const isEdit = !!contact;
  const [form, setForm] = useState({
    name: contact?.name ?? "",
    title: contact?.title ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    isPrimary: contact?.isPrimary ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSubmitting(true);
    setError(null);
    try {
      if (isEdit && contact) {
        const res = await api.patch<{ contact: CustomerContact }>(`/api/customers/${customerId}/contacts/${contact.id}`, form);
        onSaved(res.contact);
      } else {
        const res = await api.post<{ contact: CustomerContact }>(`/api/customers/${customerId}/contacts`, form);
        onSaved(res.contact);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalBox onClose={onClose} width={400}>
      <PanelHead title={isEdit ? "Edit Contact" : "Add Contact"} onClose={onClose} />
      <div className="panel-body">
        {error && <div className="banner banner-danger" style={{ marginBottom: 14 }}>{error}</div>}
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Title"><input className="input" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <div className="field-row">
          <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><input type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-soft)" }}>
          <input type="checkbox" checked={form.isPrimary} onChange={(e) => set("isPrimary", e.target.checked)} />
          Set as primary contact
        </label>
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={submitting}>{submitting ? "Saving…" : "Save"}</Button>
      </div>
    </ModalBox>
  );
}
