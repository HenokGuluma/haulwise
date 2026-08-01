"use client";

import { useEffect, useState } from "react";
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
const STATUS_ACCENT: Record<LoadStatus, string> = {
  DRAFT: "var(--slate)",
  ASSIGNED: "var(--route)",
  DISPATCHED: "var(--purple)",
  IN_TRANSIT: "var(--amber)",
  DELIVERED: "var(--success)",
  BILLED: "var(--navy-status)",
};

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

function CustomerLoadCardCompact({ load, opening, onOpen }: { load: Load; opening: boolean; onOpen: () => void }) {
  return (
    <div
      className={"load-card-compact" + (opening ? " opening" : "")}
      style={{ borderLeftColor: STATUS_ACCENT[load.status] }}
      onClick={onOpen}
    >
      <div className="lcc-top">
        <span className="lcc-id mono">{load.loadNumber}</span>
        <span className="lcc-rate mono">{fmtMoney(load.rate)}</span>
      </div>
      <div className="lcc-route">
        {load.origin} <span className="lcc-route-arrow">→</span> {load.destination}
      </div>
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
            <Icon name="list" size={13} /> Compact
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

      <div className="customer-board-scroll">
        {STATUSES.map((status) => {
          const items = loads
            .filter((l) => l.status === status)
            .sort((a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime());
          const total = items.reduce((s, l) => s + l.rate, 0);
          return (
            <div key={status} className="board-col customer-board-col">
              <div className="board-col-head">
                <span className={"board-col-icon status-" + status.replace(/_/g, "")}>
                  <Icon name={STATUS_ICONS[status]} size={22} />
                </span>
                <span className="board-col-title">{statusLabel(status)}</span>
                <span className="board-col-count">{items.length}</span>
              </div>
              <div className="board-col-body">
                {items.length === 0 ? (
                  <div style={{ padding: "18px 6px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                    No shipments
                  </div>
                ) : viewMode === "compact" ? (
                  items.map((load) => (
                    <CustomerLoadCardCompact key={load.id} load={load} opening={openingId === load.id} onOpen={() => openLoad(load.id)} />
                  ))
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
      </div>

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
