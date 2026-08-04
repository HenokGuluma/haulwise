"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  BILLED: "money",
};
const REQUIRES_ASSIGNMENT = new Set<LoadStatus>(["ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"]);

// Fixed pipeline layout: Draft → Assigned → Dispatched along the top row,
// then the flow drops down on the right and reverses — In Transit →
// Delivered → Billed — along the bottom row (a "boustrophedon" chain).
// Grid columns 2 & 4 are narrow connector tracks between the three content
// columns (1, 3, 5); grid row 2 is a narrow connector track between the
// two content rows (1, 3).
const COL_POSITION: Record<LoadStatus, { gridColumn: number; gridRow: number }> = {
  DRAFT: { gridColumn: 1, gridRow: 1 },
  ASSIGNED: { gridColumn: 3, gridRow: 1 },
  DISPATCHED: { gridColumn: 5, gridRow: 1 },
  IN_TRANSIT: { gridColumn: 5, gridRow: 3 },
  DELIVERED: { gridColumn: 3, gridRow: 3 },
  BILLED: { gridColumn: 1, gridRow: 3 },
};
const CONNECTORS: { key: string; gridColumn: number; gridRow: number; dir: "h" | "v"; icon: string }[] = [
  { key: "draft-assigned", gridColumn: 2, gridRow: 1, dir: "h", icon: "chevronRight" },
  { key: "assigned-dispatched", gridColumn: 4, gridRow: 1, dir: "h", icon: "chevronRight" },
  { key: "dispatched-transit", gridColumn: 5, gridRow: 2, dir: "v", icon: "chevronDown" },
  { key: "transit-delivered", gridColumn: 4, gridRow: 3, dir: "h", icon: "chevronLeft" },
  { key: "delivered-billed", gridColumn: 2, gridRow: 3, dir: "h", icon: "chevronLeft" },
];

type BoardFilters = { q: string; customerId: string; driverId: string; equipmentTypeCode: string };
const EMPTY_FILTERS: BoardFilters = { q: "", customerId: "", driverId: "", equipmentTypeCode: "" };
const PRESETS_KEY = "haulwise-board-presets";
const VIEW_MODE_KEY = "haulwise-board-view-mode";

function loadPresets(): { name: string; filters: BoardFilters }[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

type BoardViewMode = "detailed" | "summary";
function loadViewMode(): BoardViewMode {
  if (typeof window === "undefined") return "detailed";
  return localStorage.getItem(VIEW_MODE_KEY) === "summary" ? "summary" : "detailed";
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
  // Board cards only carry the fields rendered on the card itself (no
  // documents — see board/page.tsx) — opening a card's detail drawer
  // lazy-fetches the complete Load on demand instead.
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);
  const [assignLoad, setAssignLoad] = useState<Load | null>(null);
  const [assignPrefill, setAssignPrefill] = useState<{ driverId: string; equipmentId: string } | null>(null);
  const [editLoad, setEditLoad] = useState<Load | null>(null);
  const [cloneSource, setCloneSource] = useState<Load | null>(null);
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);
  const [presets, setPresets] = useState<{ name: string; filters: BoardFilters }[]>([]);
  const [savingPreset, setSavingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [expandedCols, setExpandedCols] = useState<Set<LoadStatus>>(new Set());
  // Defaults to "detailed" on both server and first client render (matches
  // the presets pattern below) — the saved preference is applied via
  // useEffect after mount to avoid an SSR/hydration mismatch.
  const [viewMode, setViewMode] = useState<BoardViewMode>("detailed");

  const toast = useToast();
  const router = useRouter();

  useEffect(() => setPresets(loadPresets()), []);
  useEffect(() => setViewMode(loadViewMode()), []);

  function changeViewMode(mode: BoardViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  function patchLocal(updated: Load) {
    setLoads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }
  function removeLocal(id: string) {
    setLoads((prev) => prev.filter((l) => l.id !== id));
  }

  async function openLoad(id: string) {
    try {
      const res = await api.get<{ load: Load }>(`/api/loads/${id}`);
      setDetailLoad(res.load);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't load details.");
    }
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

  function toggleExpand(status: LoadStatus) {
    setExpandedCols((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
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
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {hasFilters && <span style={{ color: "var(--muted)", fontSize: 12 }}>Filtered view</span>}
          <div className="board-view-toggle" role="tablist" aria-label="Board view">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "summary"}
              className={"board-view-toggle-btn" + (viewMode === "summary" ? " active" : "")}
              onClick={() => changeViewMode("summary")}
            >
              <Icon name="grid" size={13} /> Summary
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "detailed"}
              className={"board-view-toggle-btn" + (viewMode === "detailed" ? " active" : "")}
              onClick={() => changeViewMode("detailed")}
            >
              <Icon name="columns" size={13} /> Detailed
            </button>
          </div>
        </div>
      </div>

      {viewMode === "summary" ? (
      <div className="board-summary-grid">
        {STATUSES.map((status) => {
          const items = visible.filter((l) => l.status === status);
          const total = items.reduce((s, l) => s + l.rate, 0);
          return (
            <Link key={status} href={`/loads?status=${status}`} className="kpi-card kpi-card-link">
              <span className={"kpi-icon-badge status-" + status.replace(/_/g, "")}>
                <Icon name={STATUS_ICONS[status]} size={28} />
              </span>
              <div className="kpi-body">
                <div className="kpi-label">{STATUS_LABELS[status]}</div>
                <div className="kpi-value">{items.length}</div>
                <div className="kpi-delta">{fmtMoney(total)}</div>
              </div>
            </Link>
          );
        })}
      </div>
      ) : (
      <div className="board-scroll">
        {STATUSES.map((status) => {
          const items = visible
            .filter((l) => l.status === status)
            .sort((a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime());
          const total = items.reduce((s, l) => s + l.rate, 0);
          const pos = COL_POSITION[status];
          const expanded = expandedCols.has(status);
          return (
            <div key={status} className={"board-col" + (expanded ? " expanded" : "")} style={{ gridColumn: pos.gridColumn, gridRow: pos.gridRow }}>
              <div className="board-col-head">
                <span className={"board-col-icon status-" + status.replace(/_/g, "")}>
                  <Icon name={STATUS_ICONS[status]} size={24} />
                </span>
                <span className="board-col-title">{STATUS_LABELS[status]}</span>
                <span className="board-col-count">{items.length}</span>
                <button
                  type="button"
                  className="board-col-expand"
                  onClick={() => toggleExpand(status)}
                  title={expanded ? "Collapse" : "Expand for more detail"}
                  aria-label={expanded ? "Collapse column" : "Expand column"}
                >
                  <Icon name={expanded ? "chevronUp" : "chevronDown"} size={14} />
                </button>
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
                    onOpen={() => openLoad(load.id)}
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

        {CONNECTORS.map((c) => (
          <div key={c.key} className={"board-connector " + c.dir} style={{ gridColumn: c.gridColumn, gridRow: c.gridRow }}>
            <span className="board-connector-badge">
              <Icon name={c.icon} size={15} />
            </span>
          </div>
        ))}
      </div>
      )}

      {detailLoad && (
        <LoadDetailDrawer
          load={detailLoad}
          user={user}
          onClose={() => setDetailLoad(null)}
          onUpdated={(l) => { patchLocal(l); setDetailLoad(l); }}
          onDeleted={() => { removeLocal(detailLoad.id); setDetailLoad(null); router.refresh(); }}
          onAssign={(l) => setAssignLoad(l)}
          onEdit={(l) => { setEditLoad(l); setDetailLoad(null); }}
          onClone={(l) => { setCloneSource(l); setDetailLoad(null); }}
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
          user={user}
          onClose={() => setEditLoad(null)}
          onSaved={(l) => { patchLocal(l); setEditLoad(null); toast.success(l.loadNumber + " updated."); }}
        />
      )}

      {cloneSource && (
        <LoadFormModal
          mode="create"
          prefill={cloneSource}
          customers={customers}
          user={user}
          onClose={() => setCloneSource(null)}
          onSaved={(l) => { setLoads((prev) => [...prev, l]); setCloneSource(null); toast.success(l.loadNumber + " created as a Draft."); }}
        />
      )}
    </div>
  );
}
