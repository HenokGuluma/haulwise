"use client";

import { useState } from "react";
import { Field, ModalBox, PanelHead, Button } from "@/components/ui";
import { CustomerFormModal } from "@/components/modals/CustomerFormModal";
import { EQUIPMENT_TYPES } from "@/lib/dat";
import { api, ApiRequestError } from "@/lib/api-client";
import type { Customer, Load, EquipmentTypeCode } from "@/types";

const NEW_CUSTOMER_VALUE = "__new__";

type FormState = {
  customerId: string;
  origin: string;
  destination: string;
  pickupTime: string;
  deliveryTime: string;
  weight: string;
  rate: string;
  commodity: string;
  equipmentTypeCode: EquipmentTypeCode;
};

function toInputDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LoadFormModal({
  mode,
  load,
  customers,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  load?: Load;
  customers: Customer[];
  onClose: () => void;
  onSaved: (load: Load) => void;
}) {
  const [form, setForm] = useState<FormState>(() => ({
    customerId: (load ? load.customerId : customers[0]?.id) ?? "",
    origin: load?.origin ?? "",
    destination: load?.destination ?? "",
    pickupTime: load ? toInputDateTime(load.pickupTime) : "",
    deliveryTime: load ? toInputDateTime(load.deliveryTime) : "",
    weight: load ? String(load.weight) : "",
    rate: load ? String(load.rate) : "",
    commodity: load?.commodity ?? "",
    equipmentTypeCode: load?.equipmentTypeCode ?? "V",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [localCustomers, setLocalCustomers] = useState(customers);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customerId = "Select a customer.";
    if (!form.origin.trim()) e.origin = "Origin is required.";
    if (!form.destination.trim()) e.destination = "Destination is required.";
    if (form.origin.trim() && form.destination.trim() && form.origin.trim().toLowerCase() === form.destination.trim().toLowerCase()) {
      e.destination = "Destination must differ from origin.";
    }
    if (!form.pickupTime) e.pickupTime = "Pickup date/time is required.";
    if (!form.deliveryTime) e.deliveryTime = "Delivery date/time is required.";
    if (form.pickupTime && form.deliveryTime && new Date(form.deliveryTime) <= new Date(form.pickupTime)) {
      e.deliveryTime = "Delivery must be after pickup.";
    }
    if (!form.rate || Number(form.rate) <= 0) e.rate = "Enter a rate greater than 0.";
    if (!form.weight || Number(form.weight) <= 0) e.weight = "Enter a weight greater than 0.";
    if (!form.commodity.trim()) e.commodity = "Commodity is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);

    const payload = {
      customerId: form.customerId,
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      pickupTime: new Date(form.pickupTime).toISOString(),
      deliveryTime: new Date(form.deliveryTime).toISOString(),
      weight: Number(form.weight),
      rate: Number(form.rate),
      commodity: form.commodity.trim(),
      equipmentTypeCode: form.equipmentTypeCode,
    };

    try {
      if (mode === "edit" && load) {
        const res = await api.patch<{ load: Load }>(`/api/loads/${load.id}`, payload);
        onSaved(res.load);
      } else {
        const res = await api.post<{ load: Load }>("/api/loads", payload);
        onSaved(res.load);
      }
    } catch (err) {
      setServerError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <ModalBox onClose={onClose} width={560}>
      <PanelHead
        title={mode === "edit" && load ? "Edit " + load.loadNumber : "New Load"}
        sub={mode === "create" ? "Starts in Draft — assign a driver later from the Dispatch Board." : undefined}
        onClose={onClose}
      />
      <div className="panel-body">
        {serverError && (
          <div className="banner banner-danger" style={{ marginBottom: 14 }}>
            {serverError}
          </div>
        )}

        <Field label="Customer" error={errors.customerId}>
          <select
            className={"input" + (errors.customerId ? " err" : "")}
            value={form.customerId}
            onChange={(e) => {
              if (e.target.value === NEW_CUSTOMER_VALUE) { setNewCustomerOpen(true); return; }
              set("customerId", e.target.value);
            }}
          >
            {localCustomers.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
            <option value={NEW_CUSTOMER_VALUE}>+ Add new customer…</option>
          </select>
        </Field>

        <div className="field-row">
          <Field label="Origin" error={errors.origin}>
            <input className={"input" + (errors.origin ? " err" : "")} placeholder="City, ST" value={form.origin} onChange={(e) => set("origin", e.target.value)} />
          </Field>
          <Field label="Destination" error={errors.destination}>
            <input className={"input" + (errors.destination ? " err" : "")} placeholder="City, ST" value={form.destination} onChange={(e) => set("destination", e.target.value)} />
          </Field>
        </div>

        <div className="field-row">
          <Field label="Pickup" error={errors.pickupTime}>
            <input type="datetime-local" className={"input" + (errors.pickupTime ? " err" : "")} value={form.pickupTime} onChange={(e) => set("pickupTime", e.target.value)} />
          </Field>
          <Field label="Delivery" error={errors.deliveryTime}>
            <input type="datetime-local" className={"input" + (errors.deliveryTime ? " err" : "")} value={form.deliveryTime} onChange={(e) => set("deliveryTime", e.target.value)} />
          </Field>
        </div>

        <div className="field-row">
          <Field label="Weight (lbs)" error={errors.weight}>
            <input type="number" min="0" className={"input" + (errors.weight ? " err" : "")} value={form.weight} onChange={(e) => set("weight", e.target.value)} />
          </Field>
          <Field label="Rate (USD)" error={errors.rate}>
            <input type="number" min="0" className={"input" + (errors.rate ? " err" : "")} value={form.rate} onChange={(e) => set("rate", e.target.value)} />
          </Field>
        </div>

        <div className="field-row">
          <Field label="Commodity" error={errors.commodity}>
            <input className={"input" + (errors.commodity ? " err" : "")} placeholder="e.g. Packaged Foods" value={form.commodity} onChange={(e) => set("commodity", e.target.value)} />
          </Field>
          <Field label="Equipment Type" hint="Uses DAT-standard codes for future integration.">
            <select className="input" value={form.equipmentTypeCode} onChange={(e) => set("equipmentTypeCode", e.target.value as EquipmentTypeCode)}>
              {EQUIPMENT_TYPES.map((t) => (
                <option key={t.code} value={t.code}>{t.label} ({t.code})</option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : mode === "edit" ? "Save changes" : "Create load"}
        </Button>
      </div>
    </ModalBox>

    {newCustomerOpen && (
      <CustomerFormModal
        onClose={() => setNewCustomerOpen(false)}
        onSaved={(c) => {
          setLocalCustomers((prev) => [...prev, c]);
          set("customerId", c.id);
          setNewCustomerOpen(false);
        }}
      />
    )}
    </>
  );
}
