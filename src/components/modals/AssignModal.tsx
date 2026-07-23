"use client";

import { useMemo, useState } from "react";
import { Field, ModalBox, PanelHead, Button, Banner, Icon } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";
import type { Driver, Equipment, Load } from "@/types";

const ACTIVE_STATUSES = new Set(["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"]);

function windowsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

/** Client-side preview only — informational. The server re-checks authoritatively in /api/loads/[id]/assign. */
function previewConflicts(loads: Load[], load: Load, driverId: string, equipmentId: string): Load[] {
  if (!driverId && !equipmentId) return [];
  return loads.filter((l) => {
    if (l.id === load.id) return false;
    if (!ACTIVE_STATUSES.has(l.status)) return false;
    const sharesDriver = driverId && l.driverId === driverId;
    const sharesEquipment = equipmentId && l.equipmentId === equipmentId;
    if (!sharesDriver && !sharesEquipment) return false;
    return windowsOverlap(load.pickupTime, load.deliveryTime, l.pickupTime, l.deliveryTime);
  });
}

export function AssignModal({
  load,
  loads,
  drivers,
  equipment,
  initialDriverId,
  initialEquipmentId,
  onClose,
  onSaved,
}: {
  load: Load;
  loads: Load[];
  drivers: Driver[];
  equipment: Equipment[];
  initialDriverId?: string;
  initialEquipmentId?: string;
  onClose: () => void;
  onSaved: (load: Load) => void;
}) {
  const [driverId, setDriverId] = useState(initialDriverId ?? load.driverId ?? "");
  const [equipmentId, setEquipmentId] = useState(initialEquipmentId ?? load.equipmentId ?? "");
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const conflicts = useMemo(() => previewConflicts(loads, load, driverId, equipmentId), [loads, load, driverId, equipmentId]);

  const suggested = equipment.filter((e) => e.typeCode === load.equipmentTypeCode);
  const other = equipment.filter((e) => e.typeCode !== load.equipmentTypeCode);

  async function handleSave() {
    if (!driverId || !equipmentId) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await api.post<{ load: Load }>(`/api/loads/${load.id}/assign`, { driverId, equipmentId });
      onSaved(res.load);
    } catch (err) {
      setServerError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalBox onClose={onClose} width={460}>
      <PanelHead title={"Assign " + load.loadNumber} sub={load.origin + " → " + load.destination} onClose={onClose} />
      <div className="panel-body">
        <Field label="Driver">
          <select className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
            <option value="">Select a driver…</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.firstName} {d.lastName} — {d.status.replace("_", " ")}</option>
            ))}
          </select>
        </Field>
        <Field label="Equipment" hint={`Load requires ${load.equipmentTypeCode}-type equipment (suggested below).`}>
          <select className="input" value={equipmentId} onChange={(e) => setEquipmentId(e.target.value)}>
            <option value="">Select equipment…</option>
            <optgroup label="Recommended match">
              {suggested.map((e) => (
                <option key={e.id} value={e.id}>{e.unitNumber} — {e.status.replace("_", " ")}</option>
              ))}
            </optgroup>
            <optgroup label="Other equipment">
              {other.map((e) => (
                <option key={e.id} value={e.id}>{e.unitNumber} — {e.status.replace("_", " ")}</option>
              ))}
            </optgroup>
          </select>
        </Field>

        {serverError && <Banner tone="danger">{serverError}</Banner>}

        {!serverError && conflicts.length > 0 && (
          <Banner tone="danger">
            <strong>Double-booking conflict.</strong> This driver or equipment is already committed to{" "}
            {conflicts.map((c) => c.loadNumber).join(", ")} during an overlapping time window. Choose a different
            driver/equipment, or adjust the conflicting load&apos;s schedule first.
          </Banner>
        )}
        {!serverError && conflicts.length === 0 && driverId && equipmentId && (
          <div className="banner banner-warning" style={{ color: "var(--success)" }}>
            <Icon name="checkCircle" size={13} />
            <span>No scheduling conflicts for this window.</span>
          </div>
        )}
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} disabled={saving || conflicts.length > 0 || !driverId || !equipmentId}>
          {saving ? "Saving…" : "Save assignment"}
        </Button>
      </div>
    </ModalBox>
  );
}
