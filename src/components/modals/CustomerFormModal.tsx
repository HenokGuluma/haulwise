"use client";

import { useState } from "react";
import { Field, ModalBox, PanelHead, Button } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";
import type { Customer, CustomerStatus } from "@/types";

export function CustomerFormModal({
  customer,
  onClose,
  onSaved,
}: {
  customer?: Customer;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}) {
  const isEdit = !!customer;
  const [form, setForm] = useState({
    companyName: customer?.companyName ?? "",
    contactName: customer?.contactName ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    status: (customer?.status ?? "ACTIVE") as CustomerStatus,
    paymentTerms: customer?.paymentTerms ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = "Required.";
    if (!form.contactName.trim()) e.contactName = "Required.";
    if (!form.phone.trim()) e.phone = "Required.";
    // Email is optional — only validate the format when something's entered.
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = "Enter a valid email.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    const payload = { ...form, email: form.email.trim() || null, paymentTerms: form.paymentTerms.trim() || null };
    try {
      if (isEdit && customer) {
        const res = await api.patch<{ customer: Customer }>(`/api/customers/${customer.id}`, payload);
        onSaved(res.customer);
      } else {
        const res = await api.post<{ customer: Customer }>("/api/customers", payload);
        onSaved(res.customer);
      }
    } catch (err) {
      setServerError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalBox onClose={onClose} width={460}>
      <PanelHead title={isEdit ? "Edit Customer" : "Add Customer"} onClose={onClose} />
      <div className="panel-body">
        {serverError && <div className="banner banner-danger" style={{ marginBottom: 14 }}>{serverError}</div>}
        <Field label="Company name" error={errors.companyName}>
          <input className={"input" + (errors.companyName ? " err" : "")} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
        </Field>
        <div className="field-row">
          <Field label="Primary contact" error={errors.contactName}>
            <input className={"input" + (errors.contactName ? " err" : "")} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
          </Field>
          <Field label="Phone" error={errors.phone}>
            <input className={"input" + (errors.phone ? " err" : "")} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </div>
        <Field label="Email" hint="Optional" error={errors.email}>
          <input type="email" className={"input" + (errors.email ? " err" : "")} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <div className="field-row">
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as CustomerStatus)}>
              <option value="ACTIVE">Active</option>
              <option value="PROSPECT">Prospect</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </Field>
          <Field label="Payment terms" hint="e.g. Net 30">
            <input className="input" value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add customer"}
        </Button>
      </div>
    </ModalBox>
  );
}
