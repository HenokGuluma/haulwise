"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, useToast } from "@/components/ui";
import { RouteLine } from "@/components/RouteLine";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { fmtMoney, fmtDate, statusLabel } from "@/lib/format";
import { api, ApiRequestError } from "@/lib/api-client";
import type { Load, SessionUser, LoadStatus } from "@/types";

const STATUSES: LoadStatus[] = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"];
const STATUS_ICONS: Record<LoadStatus, string> = {
  DRAFT: "edit",
  ASSIGNED: "users",
  DISPATCHED: "route",
  IN_TRANSIT: "truck",
  DELIVERED: "checkCircle",
  BILLED: "money",
};

// Same boustrophedon pipeline layout as the internal board (BoardView.tsx):
// Draft → Assigned → Dispatched along the top row, the flow drops down on
// the right, then reverses — In Transit → Delivered → Billed — along the
// bottom row. Kept as a local copy rather than a shared import since
// BoardView's version is tightly coupled to its own drag/drop constants.
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

type BoardViewMode = "compact" | "detailed";
const VIEW_MODE_KEY = "edget-customer-board-view-mode";
function loadViewMode(): BoardViewMode {
  if (typeof window === "undefined") return "compact";
  return localStorage.getItem(VIEW_MODE_KEY) === "detailed" ? "detailed" : "compact";
}

function CustomerLoadCard({ load, opening, onOpen }: { load: Load; opening: boolean; onOpen: () => void }) {
  return (
    <div
      className={"load-card" + (opening ? " opening" : "")}
      style={{ cursor: "pointer" }}
      onClick={onOpen}
    >
      <div className="lc-top">
        <span className={"lc-equip-badge status-" + load.status.replace(/_/g, "")}>
          <Icon name={STATUS_ICONS[load.status]} size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lc-id mono">{load.loadNumber}</div>
          <div className="lc-customer">{load.commodity}</div>
        </div>
        <span className="lc-rate mono">{fmtMoney(load.rate)}</span>
      </div>

      <div className="lc-route">
        <Icon name="mapPin" size={11} className="lc-route-pin" />
        {load.origin} <span className="lc-route-arrow">→</span> {load.destination}
      </div>
      <RouteLine status={load.status} pickup={load.pickupTime} delivery={load.deliveryTime} />
      <div className="lc-meta">
        <Icon name="calendar" size={12} />
        <span>{fmtDate(load.pickupTime)} → {fmtDate(load.deliveryTime)}</span>
      </div>

      {load.driver && (
        <div className="lc-assign">
          <span className="lc-avatar">{(load.driver.firstName[0] ?? "") + (load.driver.lastName[0] ?? "")}</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{load.driver.firstName} {load.driver.lastName}</span>
          {load.equipment && (
            <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }} className="mono">
              {load.equipment.unitNumber}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function CustomerBoardView({ user, loads }: { user: SessionUser; loads: Load[] }) {
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  // Defaults to "compact" on both server and first client render — the
  // saved preference (if any) is applied after mount to avoid an
  // SSR/hydration mismatch, same pattern as the internal board's toggle.
  const [viewMode, setViewMode] = useState<BoardViewMode>("compact");
  const router = useRouter();
  const toast = useToast();

  useEffect(() => setViewMode(loadViewMode()), []);

  function changeViewMode(mode: BoardViewMode) {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  }

  // Cards only carry the fields needed to render the board (no documents —
  // see board/page.tsx), so opening one lazy-fetches the complete Load
  // instead of handing the drawer a partial object it isn't built for.
  async function openLoad(id: string) {
    setOpeningId(id);
    try {
      const res = await api.get<{ load: Load }>(`/api/loads/${id}`);
      setDetailLoad(res.load);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't load details.");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          A read-only view of where each of your shipments stands right now.
        </p>
        <div className="board-view-toggle" role="tablist" aria-label="Board view" style={{ marginLeft: "auto" }}>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === "compact"}
            className={"board-view-toggle-btn" + (viewMode === "compact" ? " active" : "")}
            onClick={() => changeViewMode("compact")}
          >
            <Icon name="grid" size={13} /> Compact
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

      {viewMode === "compact" ? (
        <div className="board-summary-grid">
          {STATUSES.map((status) => {
            const items = loads.filter((l) => l.status === status);
            const total = items.reduce((s, l) => s + l.rate, 0);
            return (
              <Link key={status} href={`/loads?status=${status}`} className="kpi-card kpi-card-link">
                <span className={"kpi-icon-badge status-" + status.replace(/_/g, "")}>
                  <Icon name={STATUS_ICONS[status]} size={28} />
                </span>
                <div className="kpi-body">
                  <div className="kpi-label">{statusLabel(status)}</div>
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
            const items = loads
              .filter((l) => l.status === status)
              .sort((a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime());
            const total = items.reduce((s, l) => s + l.rate, 0);
            const pos = COL_POSITION[status];
            return (
              <div key={status} className="board-col" style={{ gridColumn: pos.gridColumn, gridRow: pos.gridRow }}>
                <div className="board-col-head">
                  <span className={"board-col-icon status-" + status.replace(/_/g, "")}>
                    <Icon name={STATUS_ICONS[status]} size={24} />
                  </span>
                  <span className="board-col-title">{statusLabel(status)}</span>
                  <span className="board-col-count">{items.length}</span>
                </div>
                <div className="board-col-body">
                  {items.length === 0 ? (
                    <div style={{ padding: "18px 6px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                      No shipments
                    </div>
                  ) : (
                    items.map((load) => (
                      <CustomerLoadCard key={load.id} load={load} opening={openingId === load.id} onOpen={() => openLoad(load.id)} />
                    ))
                  )}
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
          onUpdated={(l) => { setDetailLoad(l); router.refresh(); }}
          onDeleted={() => { setDetailLoad(null); router.refresh(); }}
          onAssign={() => {}}
          onEdit={() => {}}
        />
      )}
    </div>
  );
}
