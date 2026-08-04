"use client";

import { useEffect, useState } from "react";
import { Field, ModalBox, PanelHead, Button, Banner } from "@/components/ui";
import { CustomerFormModal } from "@/components/modals/CustomerFormModal";
import { useEquipmentTypes } from "@/lib/useEquipmentTypes";
import { useCustomers } from "@/lib/useCustomers";
import { api, ApiRequestError } from "@/lib/api-client";
import { RATE_TYPES, RATE_TYPE_META, computeRate, type RateType } from "@/lib/rate-calc";
import { notifyDataChange } from "@/lib/data-events";
import type { Customer, Load, EquipmentTypeCode, SessionUser } from "@/types";

const NEW_CUSTOMER_VALUE = "__new__";
// Data-entry safety net, not routing logic — flags fat-finger entry errors
// (e.g. an extra zero) for a second look, doesn't block submission outright.
// Both have to be unusually high together (not either alone) — the
// previous either/or check combined with a 218-Quintal weight ceiling
// (a single-trailer's legal max payload) meant almost any real load
// tripped it, since a normal full truckload sits right around there.
const RATE_WARN_THRESHOLD = 2_000;
const WEIGHT_WARN_THRESHOLD = 5_000;
const MIN_PLAUSIBLE_TRANSIT_HOURS = 3;

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
  rateType: RateType;
  rateBasisValue: string;
  distanceKm: string;
};

function toInputDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LoadFormModal({
  mode,
  load,
  prefill,
  customers,
  user,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  load?: Load;
  /** Create-mode only: seeds the form from an existing load ("Clone load") without copying its dates/status/assignment. */
  prefill?: Load;
  /** Omit when the caller doesn't already have the full customer list (e.g. the topbar's "New Load" button) — fetched lazily on mount instead. Pass it when the caller already fetched it anyway (board/loads filters) to avoid a redundant request. */
  customers?: Customer[];
  user: SessionUser;
  onClose: () => void;
  onSaved: (load: Load) => void;
}) {
  const fetchedCustomers = useCustomers(!customers);
  const effectiveCustomers = customers ?? fetchedCustomers;
  const seed = load ?? prefill;
  const canConfigureRate = user.permissions.includes("loads:configure-rate");
  const [form, setForm] = useState<FormState>(() => ({
    customerId: (seed ? seed.customerId : effectiveCustomers[0]?.id) ?? "",
    origin: seed?.origin ?? "",
    destination: seed?.destination ?? "",
    pickupTime: load ? toInputDateTime(load.pickupTime) : "",
    deliveryTime: load ? toInputDateTime(load.deliveryTime) : "",
    weight: seed ? String(seed.weight) : "",
    rate: seed ? String(seed.rate) : "",
    commodity: seed?.commodity ?? "",
    equipmentTypeCode: seed?.equipmentTypeCode ?? "",
    rateType: seed?.rateType ?? "FLAT",
    rateBasisValue: seed?.rateBasisValue != null ? String(seed.rateBasisValue) : "",
    distanceKm: seed?.distanceKm != null ? String(seed.distanceKm) : "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [localCustomers, setLocalCustomers] = useState(effectiveCustomers);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [oversizedAck, setOversizedAck] = useState(false);
  const equipmentTypes = useEquipmentTypes();

  // Mirrors the equipmentTypeCode default-fill below: when customers arrive
  // asynchronously (the lazy-fetch path), seed the list and, for a brand
  // new load, default customerId to the first one once it's known.
  useEffect(() => {
    setLocalCustomers(effectiveCustomers);
    if (!seed && !form.customerId && effectiveCustomers.length > 0) {
      set("customerId", effectiveCustomers[0].id);
    }
  }, [effectiveCustomers]); // eslint-disable-line react-hooks/exhaustive-deps

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (["rate", "weight", "rateType", "rateBasisValue", "distanceKm"].includes(key)) setOversizedAck(false);
  }

  // Default to the first available type once the list loads (new loads only).
  useEffect(() => {
    if (!form.equipmentTypeCode && equipmentTypes.length > 0) {
      set("equipmentTypeCode", equipmentTypes[0].code);
    }
  }, [equipmentTypes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keeps the displayed total in sync with its basis for non-FLAT types —
  // the same computeRate the server uses authoritatively, so this preview
  // never disagrees with what actually gets saved. Left untouched for
  // FLAT, where `rate` is the direct manual entry.
  useEffect(() => {
    if (form.rateType === "FLAT") return;
    if (!form.pickupTime || !form.deliveryTime) return;
    const pickup = new Date(form.pickupTime);
    const delivery = new Date(form.deliveryTime);
    if (Number.isNaN(pickup.getTime()) || Number.isNaN(delivery.getTime())) return;
    const computed = computeRate({
      rateType: form.rateType,
      rateBasisValue: form.rateBasisValue ? Number(form.rateBasisValue) : null,
      flatRate: 0,
      weight: Number(form.weight) || 0,
      distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
      pickupTime: pickup,
      deliveryTime: delivery,
    });
    setForm((f) => (f.rate === String(computed) ? f : { ...f, rate: String(computed) }));
  }, [form.rateType, form.rateBasisValue, form.weight, form.distanceKm, form.pickupTime, form.deliveryTime]);

  const isOversized = Number(form.rate) > RATE_WARN_THRESHOLD && Number(form.weight) > WEIGHT_WARN_THRESHOLD;
  const transitHours = form.pickupTime && form.deliveryTime
    ? (new Date(form.deliveryTime).getTime() - new Date(form.pickupTime).getTime()) / 3_600_000
    : null;
  const showTransitWarning =
    transitHours !== null &&
    transitHours > 0 &&
    transitHours < MIN_PLAUSIBLE_TRANSIT_HOURS &&
    form.origin.trim().toLowerCase() !== form.destination.trim().toLowerCase();

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
    if (form.rateType === "FLAT" && (!form.rate || Number(form.rate) <= 0)) e.rate = "Enter a rate greater than 0.";
    if (canConfigureRate && form.rateType !== "FLAT" && (!form.rateBasisValue || Number(form.rateBasisValue) <= 0)) {
      e.rateBasisValue = "Enter a rate per unit.";
    }
    if (canConfigureRate && form.rateType === "PER_KM" && (!form.distanceKm || Number(form.distanceKm) <= 0)) {
      e.distanceKm = "Enter the distance in kilometers.";
    }
    if (!form.weight || Number(form.weight) <= 0) e.weight = "Enter a weight greater than 0.";
    if (!form.commodity.trim()) e.commodity = "Commodity is required.";
    if (!form.equipmentTypeCode) e.equipmentTypeCode = "Select an equipment type.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (isOversized && !oversizedAck) { setOversizedAck(true); return; }
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
      // Only sent at all when this user can actually configure it — an
      // edit payload that never mentions these fields can't trip the
      // server's loads:configure-rate check, so a Dispatcher editing an
      // unrelated field on someone else's PER_QUINTAL load still works.
      ...(canConfigureRate
        ? {
            rateType: form.rateType,
            rateBasisValue: form.rateType === "FLAT" ? undefined : Number(form.rateBasisValue),
            distanceKm: form.rateType === "PER_KM" ? Number(form.distanceKm) : undefined,
          }
        : {}),
    };

    try {
      if (mode === "edit" && load) {
        const res = await api.patch<{ load: Load }>(`/api/loads/${load.id}`, payload);
        notifyDataChange("loads");
        onSaved(res.load);
      } else {
        const res = await api.post<{ load: Load }>("/api/loads", payload);
        notifyDataChange("loads");
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
          <Field label="Weight (Quintals)" error={errors.weight}>
            <input type="number" min="0" className={"input" + (errors.weight ? " err" : "")} value={form.weight} onChange={(e) => set("weight", e.target.value)} />
          </Field>
          {canConfigureRate ? (
            <Field label="Rate basis">
              <select className="input" value={form.rateType} onChange={(e) => set("rateType", e.target.value as RateType)}>
                {RATE_TYPES.map((rt) => (
                  <option key={rt} value={rt}>{RATE_TYPE_META[rt].label}</option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="Rate (ETB)" error={errors.rate}>
              <input
                type="number"
                min="0"
                className={"input" + (errors.rate ? " err" : "")}
                value={form.rate}
                disabled={form.rateType !== "FLAT"}
                title={form.rateType !== "FLAT" ? `Calculated as ${RATE_TYPE_META[form.rateType].label} — only a Manager can change how this is set.` : undefined}
                onChange={(e) => set("rate", e.target.value)}
              />
            </Field>
          )}
        </div>

        {canConfigureRate && (
          <div className="field-row">
            {form.rateType === "FLAT" ? (
              <Field label="Rate (ETB)" error={errors.rate}>
                <input type="number" min="0" className={"input" + (errors.rate ? " err" : "")} value={form.rate} onChange={(e) => set("rate", e.target.value)} />
              </Field>
            ) : (
              <Field label={`Rate per unit (${RATE_TYPE_META[form.rateType].unit})`} error={errors.rateBasisValue}>
                <input type="number" min="0" className={"input" + (errors.rateBasisValue ? " err" : "")} value={form.rateBasisValue} onChange={(e) => set("rateBasisValue", e.target.value)} />
              </Field>
            )}
            {form.rateType === "PER_KM" ? (
              <Field label="Distance (km)" error={errors.distanceKm}>
                <input type="number" min="0" className={"input" + (errors.distanceKm ? " err" : "")} value={form.distanceKm} onChange={(e) => set("distanceKm", e.target.value)} />
              </Field>
            ) : form.rateType !== "FLAT" ? (
              <Field label="Total rate (ETB)">
                <input className="input" value={form.rate ? Number(form.rate).toLocaleString() : "0"} disabled readOnly />
              </Field>
            ) : null}
          </div>
        )}

        {canConfigureRate && form.rateType === "PER_KM" && (
          <div className="field-row">
            <Field label="Total rate (ETB)">
              <input className="input" value={form.rate ? Number(form.rate).toLocaleString() : "0"} disabled readOnly />
            </Field>
          </div>
        )}

        <div className="field-row">
          <Field label="Commodity" error={errors.commodity}>
            <input className={"input" + (errors.commodity ? " err" : "")} placeholder="e.g. Packaged Foods" value={form.commodity} onChange={(e) => set("commodity", e.target.value)} />
          </Field>
          <Field label="Equipment Type" error={errors.equipmentTypeCode}>
            <select className={"input" + (errors.equipmentTypeCode ? " err" : "")} value={form.equipmentTypeCode} onChange={(e) => set("equipmentTypeCode", e.target.value)}>
              {equipmentTypes.length === 0 && <option value="">Loading…</option>}
              {equipmentTypes.map((t) => (
                <option key={t.code} value={t.code}>{t.label} ({t.code})</option>
              ))}
            </select>
          </Field>
        </div>

        {showTransitWarning && (
          <Banner tone="warning">
            Only {transitHours!.toFixed(1)} hour{transitHours! === 1 ? "" : "s"} between pickup and delivery for a
            different origin/destination — double-check the times.
          </Banner>
        )}
        {isOversized && oversizedAck && (
          <Banner tone="warning">Rate or weight looks unusually high — click &quot;Confirm&quot; again to save anyway.</Banner>
        )}
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={submitting}>
          {submitting ? "Saving…" : isOversized && !oversizedAck ? "Review high value…" : isOversized && oversizedAck ? "Confirm & " + (mode === "edit" ? "save" : "create") : mode === "edit" ? "Save changes" : "Create load"}
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
