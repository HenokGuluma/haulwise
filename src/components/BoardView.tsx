"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadCard } from "@/components/LoadCard";
import { Icon, useToast } from "@/components/ui";
import { AssignModal } from "@/components/modals/AssignModal";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { LoadFormModal } from "@/components/modals/LoadFormModal";
import { fmtMoney } from "@/lib/format";
import { api, ApiRequestError } from "@/lib/api-client";
import { useEquipmentTypes } from "@/lib/useEquipmentTypes";
import type { Load, Driver, Equipment, Customer, SessionUser, LoadStatus } from "@/types";

const STATUSES: LoadStatus[] = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"];
const STATUS_LABELS: Record<LoadStatus, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  BILLED: "Billed",
};
const STATUS_ICONS: Record<LoadStatus, string> = {
  DRAFT: "edit",
  ASSIGNED: "users",
  DISPATCHED: "route",
  IN_TRANSIT: "truck",
  DELIVERED: "checkCircle",
  BILLED: "dollarSign",
};
const REQUIRES_ASSIGNMENT = new Set<LoadStatus>(["ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"]);

type BoardFilters = { q: string; customerId: string; driverId: string; equipmentTypeCode: string };
const EMPTY_FILTERS: BoardFilters = { q: "", customerId: "", driverId: "", equipmentTypeCode: "" };
const PRESETS_KEY = "haulwise-board-presets";

function loadPresets(): { name: string; filters: BoardFilters }[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function BoardView({
  user,
  initialLoads,
  drivers,
  equipment,
  customers,
}: {
  user: SessionUser;
  initialLoads: Load[];
  drivers: Driver[];
  equipment: Equipment[];
  customers: Customer[];
}) {
  const [loads, setLoads] = useState(initialLoads);
  useEffect(() => setLoads(initialLoads), [initialLoads]);
  const equipmentTypes = useEquipmentTypes();

  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<LoadStatus | null>(null);
  const [detailLoadId, setDetailLoadId] = useState<string | null>(null);
  const [assignLoad, setAssignLoad] = useState<Load | null>(null);
  const [assignPrefill, setAssignPrefill] = useState<{ driverId: string; equipmentId: string } | null>(null);
  const [editLoad, setEditLoad] = useState<Load | null>(null);
  const [cloneSource, setCloneSource] = useState<Load | null>(null);
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const [presets, setPresets] = useState<{ name: string; filters: BoardFilters }[]>([]);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");

  const toast = useToast();
  const router = useRouter();

  useEffect(() => setPresets(loadPresets()), []);

  function patchLocal(updated: Load) {
    setLoads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }
  function removeLocal(id: string) {
    setLoads((prev) => prev.filter((l) => l.id !== id));
  }

  function savePreset() {
    if (!presetName.trim()) return;
    const next = [...presets.filter((p) => p.name !== presetName.trim()), { name: presetName.trim(), filters }];
    setPresets(next);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    setSavingPreset(false);
    setPresetName("");
    toast.success("View saved.");
  }
  function deletePreset(name: string) {
    const next = presets.filter((p) => p.name !== name);
    setPresets(next);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
  }

  async function changeStatus(load: Load, status: LoadStatus) {
    if (load.status === status) return;
    if (REQUIRES_ASSIGNMENT.has(status) && (!load.driverId || !load.equipmentId)) {
      toast.error(`${load.loadNumber} needs a driver and equipment assigned before moving to ${STATUS_LABELS[status]}.`);
      setAssignLoad(load);
      return;
    }
    try {
      const res = await api.patch<{ load: Load }>(`/api/loads/${load.id}`, { status });
      patchLocal(res.load);
      toast.success(`${load.loadNumber} moved to ${STATUS_LABELS[status]}.`);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't update status.");
    }
  }

  // Keyboard-accessible alternative to drag-and-drop — native HTML5 DnD
  // (used for the drag path below) isn't operable by keyboard.
  function handleDrop(status: LoadStatus, e: React.DragEvent) {
    setOverCol(null);
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    const load = id ? loads.find((l) => l.id === id) : undefined;
    if (load) changeStatus(load, status);
  }

  async function quickAssign(load: Load, driverId: string, equipmentId: string) {
    try {
      const res = await api.post<{ load: Load }>(`/api/loads/${load.id}/assign`, { driverId, equipmentId });
      patchLocal(res.load);
      toast.success(load.loadNumber + " assigned.");
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        toast.error(err.message);
        setAssignPrefill({ driverId, equipmentId });
        setAssignLoad(load);
      } else {
        toast.error(err instanceof ApiRequestError ? err.message : "Couldn't assign.");
      }
    }
  }

  const detailLoad = detailLoadId ? loads.find((l) => l.id === detailLoadId) ?? null : null;
  const hasFilters = filters.q || filters.customerId || filters.driverId || filters.equipmentTypeCode;

  const visible = loads.filter((l) => {
    if (filters.customerId && l.customerId !== filters.customerId) return false;
    if (filters.driverId && l.driverId !== filters.driverId) return false;
    if (filters.equipmentTypeCode && l.equipmentTypeCode !== filters.equipmentTypeCode) return false;
    if (filters.q.trim()) {
      const hay = [l.loadNumber, l.origin, l.destination, l.customer?.companyName ?? ""].join(" ").toLowerCase();
      if (!hay.includes(filters.q.trim().toLowerCase())) return false;
    }
    return true;
  });
  const grandTotal = visible.reduce((s, l) => s + l.rate, 0);

  return (
    <div>
      <div className="dt-toolbar" style={{ marginBottom: 12 }}>
        <div className="search-box dt-search">
          <Icon name="search" size={14} />
          <input placeholder="Search board…" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
        <select className="input" style={{ width: 160 }} value={filters.customerId} onChange={(e) => setFilters((f) => ({ ...f, customerId: e.target.value }))}>
          <option value="">All customers</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
        </select>
        <select className="input" style={{ width: 150 }} value={filters.driverId} onChange={(e) => setFilters((f) => ({ ...f, driverId: e.target.value }))}>
          <option value="">All drivers</option>
          {drivers.map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
        </select>
        <select className="input" style={{ width: 140 }} value={filters.equipmentTypeCode} onChange={(e) => setFilters((f) => ({ ...f, equipmentTypeCode: e.target.value }))}>
          <option value="">All equipment</option>
          {equipmentTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
        </select>
        {hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear</button>}

        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          {presets.map((p) => (
            <span key={p.name} className="dt-menu-anchor" style={{ display: "inline-flex" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setFilters(p.filters)}>{p.name}</button>
              <button className="icon-btn" style={{ width: 22, height: 22, marginLeft: 2 }} title="Remove preset" aria-label="Remove preset" onClick={() => deletePreset(p.name)}>
                <Icon name="x" size={10} />
              </button>
            </span>
          ))}
          {savingPreset ? (
            <>
              <input className="input" style={{ width: 130 }} placeholder="View name…" value={presetName} onChange={(e) => setPresetName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePreset()} autoFocus />
              <button className="btn btn-primary btn-sm" onClick={savePreset}>Save</button>
            </>
          ) : (
            hasFilters && <button className="btn btn-ghost btn-sm" onClick={() => setSavingPreset(true)}>+ Save view</button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{visible.length} load{visible.length === 1 ? "" : "s"}</span>
        <span style={{ color: "var(--line)" }}>·</span>
        <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmtMoney(grandTotal)} total value</span>
        {hasFilters && <span style={{ color: "var(--muted)", fontSize: 12, marginLeft: "auto" }}>Filtered view</span>}
      </div>

      <div className="board-scroll">
        {STATUSES.map((status) => {
          const items = visible
            .filter((l) => l.status === status)
            .sort((a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime());
          const total = items.reduce((s, l) => s + l.rate, 0);
          return (
            <div key={status} className="board-col">
              <div className="board-col-head">
                <span className={"board-col-icon status-" + status.replace(/_/g, "")}>
                  <Icon name={STATUS_ICONS[status]} size={28} />
                </span>
                <span className="board-col-title">{STATUS_LABELS[status]}</span>
                <span className="board-col-count">{items.length}</span>
              </div>
              <div
                className={"board-col-body" + (overCol === status ? " drag-over" : "")}
                onDragOver={(e) => { e.preventDefault(); setOverCol(status); }}
                onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
                onDrop={(e) => { e.preventDefault(); handleDrop(status, e); }}
              >
                {items.length === 0 && (
                  <div style={{ padding: "18px 6px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>No loads</div>
                )}
                {items.map((load) => (
                  <LoadCard
                    key={load.id}
                    load={load}
                    drivers={drivers}
                    equipment={equipment}
                    equipmentTypes={equipmentTypes}
                    dragging={dragId === load.id}
                    onOpen={() => setDetailLoadId(load.id)}
                    onAssign={() => setAssignLoad(load)}
                    onQuickAssign={(driverId, equipmentId) => quickAssign(load, driverId, equipmentId)}
                    onMoveTo={(status) => changeStatus(load, status)}
                    onDragStart={(e) => {
                      setDragId(load.id);
                      e.dataTransfer.setData("text/plain", load.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setDragId(null)}
                  />
                ))}
              </div>
              {items.length > 0 && (
                <div style={{ padding: "8px 14px 12px 14px", fontSize: 11, color: "var(--muted)" }} className="mono">
                  {fmtMoney(total)} total
                </div>
              )}
            </div>
          );
        })}
      </div>

      {detailLoad && (
        <LoadDetailDrawer
          load={detailLoad}
          user={user}
          onClose={() => setDetailLoadId(null)}
          onUpdated={(l) => patchLocal(l)}
          onDeleted={() => { removeLocal(detailLoad.id); setDetailLoadId(null); router.refresh(); }}
          onAssign={(l) => setAssignLoad(l)}
          onEdit={(l) => { setEditLoad(l); setDetailLoadId(null); }}
          onClone={(l) => { setCloneSource(l); setDetailLoadId(null); }}
        />
      )}

      {assignLoad && (
        <AssignModal
          load={assignLoad}
          loads={loads}
          drivers={drivers}
          equipment={equipment}
          initialDriverId={assignPrefill?.driverId}
          initialEquipmentId={assignPrefill?.equipmentId}
          onClose={() => { setAssignLoad(null); setAssignPrefill(null); }}
          onSaved={(l) => { patchLocal(l); setAssignLoad(null); setAssignPrefill(null); toast.success(l.loadNumber + " assigned."); }}
        />
      )}

      {editLoad && (
        <LoadFormModal
          mode="edit"
          load={editLoad}
          customers={customers}
          onClose={() => setEditLoad(null)}
          onSaved={(l) => { patchLocal(l); setEditLoad(null); toast.success(l.loadNumber + " updated."); }}
        />
      )}

      {cloneSource && (
        <LoadFormModal
          mode="create"
          prefill={cloneSource}
          customers={customers}
          onClose={() => setCloneSource(null)}
          onSaved={(l) => { setLoads((prev) => [...prev, l]); setCloneSource(null); toast.success(l.loadNumber + " created as a Draft."); }}
        />
      )}
    </div>
  );
}
