"use client";

import { useEffect, useState } from "react";
import { Field, ModalBox, PanelHead, Button } from "@/components/ui";
import { useEquipmentTypes } from "@/lib/useEquipmentTypes";
import { api, ApiRequestError } from "@/lib/api-client";
import type { Equipment, EquipmentStatus, EquipmentTypeCode } from "@/types";

export function EquipmentFormModal({
  equipment,
  onClose,
  onSaved,
}: {
  equipment?: Equipment;
  onClose: () => void;
  onSaved: (equipment: Equipment) => void;
}) {
  const isEdit = !!equipment;
  const equipmentTypes = useEquipmentTypes();
  const [form, setForm] = useState({
    unitNumber: equipment?.unitNumber ?? "",
    typeCode: (equipment?.typeCode ?? "") as EquipmentTypeCode,
    status: (equipment?.status ?? "AVAILABLE") as EquipmentStatus,
    nextMaintenance: equipment?.nextMaintenance ? equipment.nextMaintenance.slice(0, 10) : "",
    licensePlate: equipment?.licensePlate ?? "",
    registrationExpiration: equipment?.registrationExpiration ? equipment.registrationExpiration.slice(0, 10) : "",
  });

  // Default to the first available type once the list loads (create mode only).
  useEffect(() => {
    if (!isEdit && !form.typeCode && equipmentTypes.length > 0) {
      set("typeCode", equipmentTypes[0].code);
    }
  }, [equipmentTypes]); // eslint-disable-line react-hooks/exhaustive-deps
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.unitNumber.trim()) e.unitNumber = "Required.";
    if (!form.typeCode) e.typeCode = "Select an equipment type.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    const payload = {
      ...form,
      nextMaintenance: form.nextMaintenance ? new Date(form.nextMaintenance).toISOString() : null,
      licensePlate: form.licensePlate.trim() || null,
      registrationExpiration: form.registrationExpiration ? new Date(form.registrationExpiration).toISOString() : null,
    };
    try {
      if (isEdit && equipment) {
        const res = await api.patch<{ equipment: Equipment }>(`/api/equipment/${equipment.id}`, payload);
        onSaved(res.equipment);
      } else {
        const res = await api.post<{ equipment: Equipment }>("/api/equipment", payload);
        onSaved(res.equipment);
      }
    } catch (err) {
      setServerError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalBox onClose={onClose} width={420}>
      <PanelHead title={isEdit ? "Edit Equipment" : "Add Equipment"} onClose={onClose} />
      <div className="panel-body">
        {serverError && <div className="banner banner-danger" style={{ marginBottom: 14 }}>{serverError}</div>}
        <Field label="Unit number" error={errors.unitNumber}>
          <input className={"input" + (errors.unitNumber ? " err" : "")} placeholder="e.g. TRL-104" value={form.unitNumber} onChange={(e) => set("unitNumber", e.target.value)} />
        </Field>
        <div className="field-row">
          <Field label="Type">
            <select className="input" value={form.typeCode} onChange={(e) => set("typeCode", e.target.value as EquipmentTypeCode)}>
              {equipmentTypes.length === 0 && <option value="">Loading…</option>}
              {equipmentTypes.map((t) => (
                <option key={t.code} value={t.code}>{t.label} ({t.code})</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => set("status", e.target.value as EquipmentStatus)}>
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In Use</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </Field>
        </div>
        <Field label="Next maintenance due" hint="Optional">
          <input type="date" className="input" value={form.nextMaintenance} onChange={(e) => set("nextMaintenance", e.target.value)} />
        </Field>
        <div className="field-row">
          <Field label="License plate">
            <input className="input" placeholder="e.g. AA-12345" value={form.licensePlate} onChange={(e) => set("licensePlate", e.target.value)} />
          </Field>
          <Field label="Insurance expiration">
            <input type="date" className="input" value={form.registrationExpiration} onChange={(e) => set("registrationExpiration", e.target.value)} />
          </Field>
        </div>
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add equipment"}
        </Button>
      </div>
    </ModalBox>
  );
}
