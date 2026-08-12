"use client";

import { useState } from "react";
import { Field, ModalBox, PanelHead, Button, Banner } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";
import { useEquipment } from "@/lib/useEquipment";
import type { Driver, DriverStatus } from "@/types";

export function DriverFormModal({
  driver,
  onClose,
  onSaved,
}: {
  driver?: Driver;
  onClose: () => void;
  onSaved: (driver: Driver) => void;
}) {
  const isEdit = !!driver;
  const equipmentList = useEquipment();
  const [form, setForm] = useState({
    firstName: driver?.firstName ?? "",
    lastName: driver?.lastName ?? "",
    phone: driver?.phone ?? "",
    licenseNo: driver?.licenseNo ?? "",
    licenseExpiration: driver ? driver.licenseExpiration.slice(0, 10) : "",
    medicalCertExpiration: driver?.medicalCertExpiration ? driver.medicalCertExpiration.slice(0, 10) : "",
    status: (driver?.status ?? "AVAILABLE") as DriverStatus,
    equipmentId: driver?.equipmentId ?? "",
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
    if (!form.lastName.trim()) e.lastName = "Required.";
    if (!form.phone.trim()) e.phone = "Required.";
    if (!form.licenseNo.trim()) e.licenseNo = "Required.";
    if (!form.licenseExpiration) e.licenseExpiration = "Required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    const payload = {
      ...form,
      licenseExpiration: new Date(form.licenseExpiration).toISOString(),
      medicalCertExpiration: form.medicalCertExpiration ? new Date(form.medicalCertExpiration).toISOString() : null,
    };
    try {
      if (isEdit && driver) {
        const res = await api.patch<{ driver: Driver }>(`/api/drivers/${driver.id}`, payload);
        onSaved(res.driver);
      } else {
        const res = await api.post<{ driver: Driver }>("/api/drivers", payload);
        onSaved(res.driver);
      }
    } catch (err) {
      setServerError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalBox onClose={onClose} width={440}>
      <PanelHead title={isEdit ? "Edit Driver" : "Add Driver"} onClose={onClose} />
      <div className="panel-body">
        {serverError && <div className="banner banner-danger" style={{ marginBottom: 14 }}>{serverError}</div>}
        <div className="field-row">
          <Field label="First name" error={errors.firstName}>
            <input className={"input" + (errors.firstName ? " err" : "")} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </Field>
          <Field label="Last name" error={errors.lastName}>
            <input className={"input" + (errors.lastName ? " err" : "")} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </Field>
        </div>
        <Field label="Phone" error={errors.phone}>
          <input className={"input" + (errors.phone ? " err" : "")} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <div className="field-row">
          <Field label="Driver's License number" error={errors.licenseNo}>
            <input className={"input" + (errors.licenseNo ? " err" : "")} value={form.licenseNo} onChange={(e) => set("licenseNo", e.target.value)} />
          </Field>
          <Field label="License expiration" error={errors.licenseExpiration}>
            <input type="date" className={"input" + (errors.licenseExpiration ? " err" : "")} value={form.licenseExpiration} onChange={(e) => set("licenseExpiration", e.target.value)} />
          </Field>
        </div>
        <Field label="Medical cert expiration" hint="Optional">
          <input type="date" className="input" value={form.medicalCertExpiration} onChange={(e) => set("medicalCertExpiration", e.target.value)} />
        </Field>
        <Field label="Status">
          <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as DriverStatus)}>
            <option value="AVAILABLE">Available</option>
            <option value="ON_DUTY">On Duty</option>
            <option value="OFF_DUTY">Off Duty</option>
          </select>
        </Field>
        <Field label="Assigned equipment" hint="Optional — pulled onto any load this driver is assigned to">
          <select className="input" value={form.equipmentId} onChange={(e) => set("equipmentId", e.target.value)}>
            <option value="">No equipment linked</option>
            {equipmentList.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.unitNumber} ({eq.typeCode})</option>
            ))}
          </select>
        </Field>
        {!form.equipmentId && (
          <Banner tone="warning">
            No equipment linked. You can still save, but you&apos;ll need to link equipment before this driver can be assigned to a load.
          </Banner>
        )}
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add driver"}
        </Button>
      </div>
    </ModalBox>
  );
}
