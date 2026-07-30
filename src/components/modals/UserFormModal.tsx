"use client";

import { useState } from "react";
import { Field, ModalBox, PanelHead, Button } from "@/components/ui";
import { useCustomers } from "@/lib/useCustomers";
import { api, ApiRequestError } from "@/lib/api-client";
import type { UserRow, Role } from "@/types";

export function UserFormModal({
  row,
  onClose,
  onSaved,
}: {
  row?: UserRow;
  onClose: () => void;
  onSaved: (row: UserRow) => void;
}) {
  const isEdit = !!row;
  const customers = useCustomers();
  const [form, setForm] = useState({
    firstName: row?.firstName ?? "",
    lastName: row?.lastName ?? "",
    email: row?.email ?? "",
    password: "",
    role: (row?.role ?? "DISPATCHER") as Role,
    customerId: row?.customerId ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required.";
    if (!form.email.trim()) e.email = "Required.";
    if (!isEdit && form.password.length < 8) e.password = "At least 8 characters.";
    if (isEdit && form.password && form.password.length < 8) e.password = "At least 8 characters.";
    if (form.role === "CUSTOMER" && !form.customerId) e.customerId = "Select a customer.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    const payload: Record<string, unknown> = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      role: form.role,
      customerId: form.role === "CUSTOMER" ? form.customerId : null,
    };
    if (form.password) payload.password = form.password;
    try {
      if (isEdit && row) {
        const res = await api.patch<{ user: UserRow }>(`/api/users/${row.id}`, payload);
        onSaved(res.user);
      } else {
        const res = await api.post<{ user: UserRow }>("/api/users", payload);
        onSaved(res.user);
      }
    } catch (err) {
      setServerError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalBox onClose={onClose} width={440}>
      <PanelHead title={isEdit ? "Edit User" : "Add User"} onClose={onClose} />
      <div className="panel-body">
        {serverError && <div className="banner banner-danger" style={{ marginBottom: 14 }}>{serverError}</div>}
        <div className="field-row">
          <Field label="First name" error={errors.firstName}>
            <input className={"input" + (errors.firstName ? " err" : "")} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </Field>
          <Field label="Last name" hint="Optional">
            <input className="input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </Field>
        </div>
        <Field label="Email" error={errors.email}>
          <input type="email" className={"input" + (errors.email ? " err" : "")} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label={isEdit ? "Reset password" : "Password"} error={errors.password} hint={isEdit ? "Leave blank to keep current password" : undefined}>
          <input type="password" className={"input" + (errors.password ? " err" : "")} value={form.password} onChange={(e) => set("password", e.target.value)} />
        </Field>
        <Field label="Role">
          <select className="input" value={form.role} onChange={(e) => set("role", e.target.value as Role)}>
            <option value="ADMIN">Admin</option>
            <option value="DISPATCHER">Dispatcher</option>
            <option value="CUSTOMER">Customer</option>
          </select>
        </Field>
        {form.role === "CUSTOMER" && (
          <Field label="Customer" error={errors.customerId} hint="This account will only see this customer's loads and documents">
            <select className={"input" + (errors.customerId ? " err" : "")} value={form.customerId} onChange={(e) => set("customerId", e.target.value)}>
              <option value="">Select a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add user"}
        </Button>
      </div>
    </ModalBox>
  );
}
