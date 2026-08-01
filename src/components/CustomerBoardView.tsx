"use client";

import { useState } from "react";
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
  const router = useRouter();
  const toast = useToast();

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
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        A read-only view of where each of your shipments stands right now.
      </p>
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
