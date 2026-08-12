"use client";

import { useEffect, useState } from "react";
import { Field, ModalBox, PanelHead, Button, Banner } from "@/components/ui";
import { CustomerFormModal } from "@/components/modals/CustomerFormModal";
import { useEquipmentTypes } from "@/lib/useEquipmentTypes";
import { useCustomers } from "@/lib/useCustomers";
import { api, ApiRequestError } from "@/lib/api-client";
import { fmtMoney } from "@/lib/format";
import { RATE_TYPES, RATE_TYPE_META, computeRate, rateBasisQuantity, type RateType } from "@/lib/rate-calc";
import { DRIVER_PAY_TYPES, DRIVER_PAY_TYPE_LABELS, DEFAULT_DRIVER_PAY_VALUE, computeDriverPay, type DriverPayType } from "@/lib/driver-pay-calc";
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
  driverPayType: DriverPayType;
  driverPayValue: string;
};

/** A computed, non-editable total (Total rate, Driver pay total) — the
 * system derives these from the figures entered above by multiplying
 * them out, so they read as a plain result, not another field to fill in. */
function ComputedFigure({ value }: { value: number }) {
  return (
    <div className="mono" style={{ padding: "9px 0", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
      {fmtMoney(value)}
    </div>
  );
}

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
  // Configuring the rate basis and driver-pay basis is a fundamental part of
  // creating/editing a load, available to any role that can do so — not a
  // separate Manager-only capability. Anyone who can open this modal already
  // holds loads:create or loads:edit, so this is effectively always on.
  const canConfigureRate = user.permissions.includes("loads:create") || user.permissions.includes("loads:edit");
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
    driverPayType: seed?.driverPayType ?? "PERCENTAGE",
    driverPayValue: seed?.driverPayValue != null ? String(seed.driverPayValue) : String(DEFAULT_DRIVER_PAY_VALUE),
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [localCustomers, setLocalCustomers] = useState(effectiveCustomers);
  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [oversizedAck, setOversizedAck] = useState(false);
  // True while driverPayValue is still "whatever the 70% default
  // computes to" rather than something the user deliberately typed —
  // lets the effect below keep it in sync with the rate basis/type it's
  // built from. Starts true for a brand-new load (nothing to preserve
  // yet) and false when editing or cloning an existing one (its saved
  // value was a deliberate choice, not silently recomputed just because
  // some other field on the load gets edited).
  const [driverPayIsDefault, setDriverPayIsDefault] = useState(!seed);
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

  // Computed directly during render instead of synced into state via a
  // useEffect — the previous version stored the non-FLAT total back into
  // form.rate from an effect, which only runs after a render commits, so
  // every keystroke showed the *previous* total for one extra render
  // cycle before catching up. Deriving it directly here means the
  // figures on screen are never stale, not even briefly. FLAT is
  // unaffected either way — `rate` there is always the direct manual
  // entry, no derivation involved.
  const pickup = form.pickupTime ? new Date(form.pickupTime) : null;
  const delivery = form.deliveryTime ? new Date(form.deliveryTime) : null;

  // Falls back to an epoch dummy date when pickup/delivery aren't filled
  // in yet, same as effectiveRate below — Per Quintal and Per Kilometer
  // don't use pickup/delivery at all, so gating this on both dates being
  // present (as an earlier version did) needlessly zeroed out Own Rate
  // driver pay for those two types whenever the dates just hadn't been
  // reached yet in the form. Only Per Transit Hour actually depends on
  // the dates, and correctly reads as 0 until they're real.
  const basisQuantity =
    form.rateType === "FLAT"
      ? null
      : rateBasisQuantity({
          rateType: form.rateType,
          weight: Number(form.weight) || 0,
          distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
          pickupTime: pickup ?? new Date(0),
          deliveryTime: delivery ?? new Date(0),
        });

  const effectiveRate =
    form.rateType === "FLAT"
      ? Number(form.rate) || 0
      : computeRate({
          rateType: form.rateType,
          rateBasisValue: form.rateBasisValue ? Number(form.rateBasisValue) : null,
          flatRate: 0,
          weight: Number(form.weight) || 0,
          distanceKm: form.distanceKm ? Number(form.distanceKm) : null,
          pickupTime: pickup ?? new Date(0),
          deliveryTime: delivery ?? new Date(0),
        });

  // Keeps driverPayValue at "70% of whatever it's calculated against"
  // whenever that basis changes — the flat 70 itself for Percentage (no
  // customer number involved), 70% of the customer's own per-unit rate
  // for Own Rate, or 70% of the computed total for Fixed — so switching
  // Driver pay basis, or later editing any of the rate figures above,
  // keeps suggesting the current equivalent. driverPayIsDefault flips to
  // false the moment the user types into the value field directly (see
  // its onChange below), so a deliberate override is never silently
  // overwritten by a later rate edit.
  useEffect(() => {
    if (!canConfigureRate || !driverPayIsDefault) return;
    const next =
      form.driverPayType === "PERCENTAGE"
        ? DEFAULT_DRIVER_PAY_VALUE
        : form.driverPayType === "PER_UNIT"
        ? Math.round((DEFAULT_DRIVER_PAY_VALUE / 100) * (Number(form.rateBasisValue) || 0))
        : Math.round((DEFAULT_DRIVER_PAY_VALUE / 100) * effectiveRate);
    const nextStr = String(next);
    setForm((f) => (f.driverPayValue === nextStr ? f : { ...f, driverPayValue: nextStr }));
  }, [canConfigureRate, driverPayIsDefault, form.driverPayType, form.rateBasisValue, effectiveRate]);

  // Live preview only — the server clamps and computes this authoritatively
  // on save, same as rate above, so this can never disagree with what's
  // actually persisted.
  const driverPayPreview = computeDriverPay({
    driverPayType: form.driverPayType,
    driverPayValue: Number(form.driverPayValue) || 0,
    rate: effectiveRate,
    basisQuantity,
  });
  // Unclamped, for the "exceeds rate" validation message below —
  // driverPayPreview above is already capped at effectiveRate, so
  // comparing against that would never trip.
  const rawDriverPay =
    form.driverPayType === "FIXED"
      ? Number(form.driverPayValue) || 0
      : form.driverPayType === "PER_UNIT"
      ? (Number(form.driverPayValue) || 0) * (basisQuantity ?? 0)
      : null;

  const isOversized = effectiveRate > RATE_WARN_THRESHOLD && Number(form.weight) > WEIGHT_WARN_THRESHOLD;
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
    if (canConfigureRate) {
      if (form.driverPayType === "PERCENTAGE" && (Number(form.driverPayValue) < 0 || Number(form.driverPayValue) > 100)) {
        e.driverPayValue = "Enter a percentage between 0 and 100.";
      }
      if (form.driverPayType !== "PERCENTAGE" && (!form.driverPayValue || Number(form.driverPayValue) <= 0)) {
        e.driverPayValue = form.driverPayType === "PER_UNIT" ? "Enter a driver rate greater than 0." : "Enter a driver pay amount greater than 0.";
      }
      if (rawDriverPay !== null && rawDriverPay > effectiveRate) {
        e.driverPayValue = "Driver pay can't exceed the rate.";
      }
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
      rate: effectiveRate,
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
            driverPayType: form.driverPayType,
            driverPayValue: Number(form.driverPayValue),
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
              <select
                className="input"
                value={form.rateType}
                onChange={(e) => {
                  const nextRateType = e.target.value as RateType;
                  // Own-rate driver pay only makes sense with a quantity
                  // to correlate against — falls back to the default
                  // percentage if the rate basis switches to Flat out
                  // from under it (the sync effect above then recomputes
                  // driverPayValue for that new type automatically).
                  const conflictsWithOwnRate = nextRateType === "FLAT" && form.driverPayType === "PER_UNIT";
                  setForm((f) => ({
                    ...f,
                    rateType: nextRateType,
                    ...(conflictsWithOwnRate ? { driverPayType: "PERCENTAGE" as DriverPayType } : {}),
                  }));
                  if (conflictsWithOwnRate) setDriverPayIsDefault(true);
                  setOversizedAck(false);
                }}
              >
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
                value={form.rateType === "FLAT" ? form.rate : String(effectiveRate)}
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
              <Field label="Total rate">
                <ComputedFigure value={effectiveRate} />
              </Field>
            ) : null}
          </div>
        )}

        {canConfigureRate && form.rateType === "PER_KM" && (
          <div className="field-row">
            <Field label="Total rate">
              <ComputedFigure value={effectiveRate} />
            </Field>
          </div>
        )}

        {canConfigureRate && (
          <div className="field-row">
            <Field label="Driver pay basis">
              <select
                className="input"
                value={form.driverPayType}
                onChange={(e) => {
                  // Switching basis always re-seeds a fresh 70% default
                  // for whichever type was just picked (the sync effect
                  // above computes the actual number) — a prior manual
                  // override doesn't carry across a basis switch, since
                  // e.g. a hand-typed percentage has no sensible meaning
                  // once you've switched to Own Rate.
                  set("driverPayType", e.target.value as DriverPayType);
                  setDriverPayIsDefault(true);
                }}
              >
                {DRIVER_PAY_TYPES.filter((t) => t !== "PER_UNIT" || form.rateType !== "FLAT").map((t) => (
                  <option key={t} value={t}>{DRIVER_PAY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </Field>
            <Field
              label={
                form.driverPayType === "PERCENTAGE" ? "Driver pay (%)"
                : form.driverPayType === "PER_UNIT" ? `Driver rate (${RATE_TYPE_META[form.rateType].unit})`
                : "Driver pay (ETB)"
              }
              error={errors.driverPayValue}
            >
              <input
                type="number"
                min="0"
                max={form.driverPayType === "PERCENTAGE" ? 100 : undefined}
                className={"input" + (errors.driverPayValue ? " err" : "")}
                value={form.driverPayValue}
                onChange={(e) => {
                  set("driverPayValue", e.target.value);
                  setDriverPayIsDefault(false);
                }}
              />
            </Field>
          </div>
        )}
        {canConfigureRate && (
          <div className="field-row">
            <Field label="Driver pay total">
              <ComputedFigure value={driverPayPreview} />
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
