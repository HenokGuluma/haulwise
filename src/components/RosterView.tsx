"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Pill, Button, IconButton, ConfirmDialog, useToast } from "@/components/ui";
import { DriverFormModal } from "@/components/modals/DriverFormModal";
import { EquipmentFormModal } from "@/components/modals/EquipmentFormModal";
import { daysUntil } from "@/lib/format";
import { api, ApiRequestError } from "@/lib/api-client";
import type { Driver, Equipment, SessionUser } from "@/types";

function initials(a: string, b: string) {
  return (a?.[0] || "").toUpperCase() + (b?.[0] || "").toUpperCase();
}

function serviceTone(days: number): "danger" | "warning" | "success" {
  if (days < 0) return "danger";
  if (days <= 14) return "danger";
  if (days <= 30) return "warning";
  return "success";
}
function serviceLabel(days: number, kind: "license" | "maintenance") {
  if (kind === "license") {
    if (days < 0) return "Expired " + Math.abs(days) + "d ago";
    if (days === 0) return "Expires today";
    return "Expires in " + days + "d";
  }
  if (days < 0) return "Maintenance overdue";
  return "Service in " + days + "d";
}

export function RosterView({
  user,
  initialDrivers,
  initialEquipment,
  activeLoadCounts,
}: {
  user: SessionUser;
  initialDrivers: Driver[];
  initialEquipment: Equipment[];
  activeLoadCounts: { byDriver: Record<string, number>; byEquipment: Record<string, number> };
}) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [equipment, setEquipment] = useState(initialEquipment);
  useEffect(() => setDrivers(initialDrivers), [initialDrivers]);
  useEffect(() => setEquipment(initialEquipment), [initialEquipment]);

  const [tab, setTab] = useState<"drivers" | "equipment">("drivers");
  const [driverForm, setDriverForm] = useState<{ open: boolean; driver?: Driver }>({ open: false });
  const [equipmentForm, setEquipmentForm] = useState<{ open: boolean; equipment?: Equipment }>({ open: false });
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const toast = useToast();
  const router = useRouter();
  const canDelete = user.role === "ADMIN";

  async function deleteDriver(id: string) {
    try {
      await api.del(`/api/drivers/${id}`);
      setDrivers((prev) => prev.filter((d) => d.id !== id));
      toast.success("Driver removed from roster.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't delete driver.");
    }
  }

  async function deleteEquipment(id: string) {
    try {
      await api.del(`/api/equipment/${id}`);
      setEquipment((prev) => prev.filter((e) => e.id !== id));
      toast.success("Equipment removed from fleet.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't delete equipment.");
    }
  }

  return (
    <div>
      <div className="tabbar">
        <button className={"tab" + (tab === "drivers" ? " active" : "")} onClick={() => setTab("drivers")}>Drivers ({drivers.length})</button>
        <button className={"tab" + (tab === "equipment" ? " active" : "")} onClick={() => setTab("equipment")}>Equipment ({equipment.length})</button>
      </div>

      <div style={{ display: "flex", marginBottom: 14 }}>
        <div style={{ marginLeft: "auto" }}>
          {tab === "drivers" ? (
            <Button variant="primary" icon="plus" onClick={() => setDriverForm({ open: true })}>Add Driver</Button>
          ) : (
            <Button variant="primary" icon="plus" onClick={() => setEquipmentForm({ open: true })}>Add Equipment</Button>
          )}
        </div>
      </div>

      {tab === "drivers" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {drivers.map((d) => {
            const days = daysUntil(d.licenseExpiration);
            const statusTone = d.status === "AVAILABLE" ? "success" : d.status === "ON_DUTY" ? "warning" : "muted";
            const loadCount = activeLoadCounts.byDriver[d.id] ?? 0;
            return (
              <div key={d.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span className="lc-avatar" style={{ width: 36, height: 36, fontSize: 13, borderRadius: 10 }}>{initials(d.firstName, d.lastName)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{d.firstName} {d.lastName}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{d.phone}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <IconButton icon="edit" title="Edit driver" onClick={() => setDriverForm({ open: true, driver: d })} />
                    <IconButton
                      icon="trash"
                      title={canDelete ? "Delete driver" : "Admin only"}
                      onClick={canDelete ? () => setConfirm({
                        title: "Delete driver",
                        message: `Remove ${d.firstName} ${d.lastName} from the roster? This cannot be undone.`,
                        onConfirm: () => deleteDriver(d.id),
                      }) : undefined}
                      style={!canDelete ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                    />
                  </div>
                </div>
                <div className="divider" style={{ margin: "12px 0" }}></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                  <Pill tone={statusTone} dot>{d.status.replace("_", " ")}</Pill>
                  <span className="mono" style={{ color: "var(--muted)" }}>{d.licenseNo}</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Pill tone={serviceTone(days)}>{serviceLabel(days, "license")}</Pill>
                </div>
                {loadCount > 0 && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>{loadCount} active load{loadCount === 1 ? "" : "s"}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
          {equipment.map((e) => {
            const days = daysUntil(e.nextMaintenance);
            const statusTone = e.status === "AVAILABLE" ? "success" : e.status === "IN_USE" ? "warning" : "danger";
            const loadCount = activeLoadCounts.byEquipment[e.id] ?? 0;
            return (
              <div key={e.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span className="lc-avatar" style={{ width: 36, height: 36, fontSize: 13, borderRadius: 10, background: "var(--route-bg)", color: "var(--route)" }}>{e.typeCode}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }} className="mono">{e.unitNumber}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <IconButton icon="edit" title="Edit equipment" onClick={() => setEquipmentForm({ open: true, equipment: e })} />
                    <IconButton
                      icon="trash"
                      title={canDelete ? "Delete equipment" : "Admin only"}
                      onClick={canDelete ? () => setConfirm({
                        title: "Delete equipment",
                        message: `Remove unit ${e.unitNumber} from the fleet? This cannot be undone.`,
                        onConfirm: () => deleteEquipment(e.id),
                      }) : undefined}
                      style={!canDelete ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                    />
                  </div>
                </div>
                <div className="divider" style={{ margin: "12px 0" }}></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5 }}>
                  <Pill tone={statusTone} dot>{e.status.replace("_", " ")}</Pill>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Pill tone={serviceTone(days)}><Icon name="wrench" size={11} /> {serviceLabel(days, "maintenance")}</Pill>
                </div>
                {loadCount > 0 && <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>{loadCount} active load{loadCount === 1 ? "" : "s"}</div>}
              </div>
            );
          })}
        </div>
      )}

      {driverForm.open && (
        <DriverFormModal
          driver={driverForm.driver}
          onClose={() => setDriverForm({ open: false })}
          onSaved={(d) => {
            setDrivers((prev) => (driverForm.driver ? prev.map((x) => (x.id === d.id ? d : x)) : [...prev, d]));
            toast.success(driverForm.driver ? "Driver updated." : "Driver added to roster.");
            setDriverForm({ open: false });
          }}
        />
      )}

      {equipmentForm.open && (
        <EquipmentFormModal
          equipment={equipmentForm.equipment}
          onClose={() => setEquipmentForm({ open: false })}
          onSaved={(e) => {
            setEquipment((prev) => (equipmentForm.equipment ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e]));
            toast.success(equipmentForm.equipment ? "Equipment updated." : "Equipment added to fleet.");
            setEquipmentForm({ open: false });
          }}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onCancel={() => setConfirm(null)}
          onConfirm={() => { confirm.onConfirm(); setConfirm(null); }}
        />
      )}
    </div>
  );
}
