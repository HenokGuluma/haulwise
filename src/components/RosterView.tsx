"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Pill, Button, IconButton, ConfirmDialog, useToast } from "@/components/ui";
import { DataTable, type FetchPageParams } from "@/components/DataTable";
import { DriverFormModal } from "@/components/modals/DriverFormModal";
import { EquipmentFormModal } from "@/components/modals/EquipmentFormModal";
import { daysUntil } from "@/lib/format";
import { api, fetchTablePage, ApiRequestError } from "@/lib/api-client";
import type { Driver, Equipment, SessionUser, DriverStatus, EquipmentStatus, EquipmentTypeCode } from "@/types";

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

const DRIVER_STATUSES: DriverStatus[] = ["AVAILABLE", "ON_DUTY", "OFF_DUTY"];
const EQUIPMENT_STATUSES: EquipmentStatus[] = ["AVAILABLE", "IN_USE", "MAINTENANCE"];
const EQUIPMENT_TYPES: EquipmentTypeCode[] = ["V", "R", "F", "PO"];

export function RosterView({
  user,
  activeLoadCounts,
}: {
  user: SessionUser;
  initialDrivers?: Driver[];
  initialEquipment?: Equipment[];
  activeLoadCounts: { byDriver: Record<string, number>; byEquipment: Record<string, number> };
}) {
  const [tab, setTab] = useState<"drivers" | "equipment">("drivers");
  const [driverForm, setDriverForm] = useState<{ open: boolean; driver?: Driver }>({ open: false });
  const [equipmentForm, setEquipmentForm] = useState<{ open: boolean; equipment?: Equipment }>({ open: false });
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [driverCount, setDriverCount] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [driverReload, setDriverReload] = useState(0);
  const [equipmentReload, setEquipmentReload] = useState(0);

  const toast = useToast();
  const router = useRouter();
  const canDelete = user.role === "ADMIN";

  const fetchDrivers = useCallback((params: FetchPageParams) => fetchTablePage<Driver>("/api/drivers", params), []);
  const fetchEquipment = useCallback((params: FetchPageParams) => fetchTablePage<Equipment>("/api/equipment", params), []);

  async function deleteDriver(id: string) {
    try {
      await api.del(`/api/drivers/${id}`);
      toast.success("Driver removed from roster.");
      setDriverReload((k) => k + 1);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't delete driver.");
    }
  }

  async function deleteEquipment(id: string) {
    try {
      await api.del(`/api/equipment/${id}`);
      toast.success("Equipment removed from fleet.");
      setEquipmentReload((k) => k + 1);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't delete equipment.");
    }
  }

  return (
    <div>
      <div className="tabbar">
        <button className={"tab" + (tab === "drivers" ? " active" : "")} onClick={() => setTab("drivers")}>Drivers ({driverCount})</button>
        <button className={"tab" + (tab === "equipment" ? " active" : "")} onClick={() => setTab("equipment")}>Equipment ({equipmentCount})</button>
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
        <DataTable<Driver>
          tableId="roster-drivers"
          fetchPage={fetchDrivers}
          reloadKey={driverReload}
          rowKey={(d) => d.id}
          onTotalChange={setDriverCount}
          searchPlaceholder="Search drivers…"
          emptyIcon="users"
          emptyTitle="No drivers match"
          csvFilename="haulwise-drivers.csv"
          initialSort={{ by: "name", dir: "asc" }}
          columns={[
            {
              key: "name",
              label: "Driver",
              sortable: true,
              render: (d) => (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="lc-avatar">{initials(d.firstName, d.lastName)}</span>
                  {d.firstName} {d.lastName}
                </span>
              ),
              exportValue: (d) => `${d.firstName} ${d.lastName}`,
            },
            { key: "phone", label: "Phone" },
            { key: "licenseNo", label: "License #", render: (d) => <span className="mono">{d.licenseNo}</span> },
            {
              key: "licenseExpiration",
              label: "License",
              sortable: true,
              render: (d) => { const days = daysUntil(d.licenseExpiration); return <Pill tone={serviceTone(days)}>{serviceLabel(days, "license")}</Pill>; },
              exportValue: (d) => new Date(d.licenseExpiration).toISOString().slice(0, 10),
            },
            {
              key: "status",
              label: "Status",
              sortable: true,
              filterOptions: DRIVER_STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") })),
              render: (d) => <Pill tone={d.status === "AVAILABLE" ? "success" : d.status === "ON_DUTY" ? "warning" : "muted"} dot>{d.status.replace("_", " ")}</Pill>,
              exportValue: (d) => d.status,
            },
            {
              key: "activeLoads",
              label: "Active Loads",
              align: "right",
              render: (d) => activeLoadCounts.byDriver[d.id] ?? 0,
              exportValue: (d) => activeLoadCounts.byDriver[d.id] ?? 0,
            },
            {
              key: "actions",
              label: "",
              align: "right",
              render: (d) => (
                <span style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
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
                </span>
              ),
            },
          ]}
        />
      ) : (
        <DataTable<Equipment>
          tableId="roster-equipment"
          fetchPage={fetchEquipment}
          reloadKey={equipmentReload}
          rowKey={(e) => e.id}
          onTotalChange={setEquipmentCount}
          searchPlaceholder="Search equipment…"
          emptyIcon="truck"
          emptyTitle="No equipment matches"
          csvFilename="haulwise-equipment.csv"
          initialSort={{ by: "unitNumber", dir: "asc" }}
          columns={[
            {
              key: "unitNumber",
              label: "Unit",
              sortable: true,
              render: (e) => (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="lc-avatar" style={{ background: "var(--route-bg)", color: "var(--route)" }}>{e.typeCode}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{e.unitNumber}</span>
                </span>
              ),
            },
            {
              key: "typeCode",
              label: "Type",
              sortable: true,
              filterOptions: EQUIPMENT_TYPES.map((t) => ({ value: t, label: t })),
              render: (e) => e.typeCode,
            },
            {
              key: "status",
              label: "Status",
              sortable: true,
              filterOptions: EQUIPMENT_STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") })),
              render: (e) => <Pill tone={e.status === "AVAILABLE" ? "success" : e.status === "IN_USE" ? "warning" : "danger"} dot>{e.status.replace("_", " ")}</Pill>,
              exportValue: (e) => e.status,
            },
            {
              key: "nextMaintenance",
              label: "Maintenance",
              sortable: true,
              render: (e) => { const days = daysUntil(e.nextMaintenance); return <Pill tone={serviceTone(days)}><Icon name="wrench" size={11} /> {serviceLabel(days, "maintenance")}</Pill>; },
              exportValue: (e) => new Date(e.nextMaintenance).toISOString().slice(0, 10),
            },
            {
              key: "activeLoads",
              label: "Active Loads",
              align: "right",
              render: (e) => activeLoadCounts.byEquipment[e.id] ?? 0,
              exportValue: (e) => activeLoadCounts.byEquipment[e.id] ?? 0,
            },
            {
              key: "actions",
              label: "",
              align: "right",
              render: (e) => (
                <span style={{ display: "flex", gap: 4, justifyContent: "flex-end" }} onClick={(ev) => ev.stopPropagation()}>
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
                </span>
              ),
            },
          ]}
        />
      )}

      {driverForm.open && (
        <DriverFormModal
          driver={driverForm.driver}
          onClose={() => setDriverForm({ open: false })}
          onSaved={() => {
            toast.success(driverForm.driver ? "Driver updated." : "Driver added to roster.");
            setDriverForm({ open: false });
            setDriverReload((k) => k + 1);
          }}
        />
      )}

      {equipmentForm.open && (
        <EquipmentFormModal
          equipment={equipmentForm.equipment}
          onClose={() => setEquipmentForm({ open: false })}
          onSaved={() => {
            toast.success(equipmentForm.equipment ? "Equipment updated." : "Equipment added to fleet.");
            setEquipmentForm({ open: false });
            setEquipmentReload((k) => k + 1);
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
