"use client";

import { useState } from "react";
import { Icon } from "@/components/ui";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { fmtMoney, fmtDate, statusLabel } from "@/lib/format";
import type { Load, SessionUser, LoadStatus } from "@/types";

const STATUSES: LoadStatus[] = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"];

function CustomerLoadCard({ load, onOpen }: { load: Load; onOpen: () => void }) {
  return (
    <div className="card" style={{ padding: 12, marginBottom: 10, cursor: "pointer" }} onClick={onOpen}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{load.loadNumber}</span>
        <span className="mono" style={{ fontWeight: 600, fontSize: 12.5 }}>{fmtMoney(load.rate)}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
        <Icon name="mapPin" size={11} />
        {load.origin} <span style={{ opacity: 0.6 }}>→</span> {load.destination}
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
        <Icon name="calendar" size={11} />
        {fmtDate(load.pickupTime)} → {fmtDate(load.deliveryTime)}
      </div>
      {load.driver && (
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
          {load.driver.firstName} {load.driver.lastName}{load.equipment ? ` · ${load.equipment.unitNumber}` : ""}
        </div>
      )}
    </div>
  );
}

export function CustomerBoardView({ user, loads }: { user: SessionUser; loads: Load[] }) {
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>
        A read-only view of where each of your shipments stands right now.
      </p>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
        {STATUSES.map((status) => {
          const items = loads.filter((l) => l.status === status);
          return (
            <div key={status} style={{ flex: "0 0 220px", minWidth: 220 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "0 2px" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{statusLabel(status)}</span>
                <span className="pill pill-muted" style={{ marginLeft: "auto" }}>{items.length}</span>
              </div>
              <div style={{ minHeight: 40 }}>
                {items.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--muted)", padding: "10px 2px" }}>No shipments</div>
                ) : (
                  items.map((load) => <CustomerLoadCard key={load.id} load={load} onOpen={() => setDetailLoad(load)} />)
                )}
              </div>
            </div>
          );
        })}
      </div>

      {detailLoad && (
        <LoadDetailDrawer
          load={detailLoad}
          user={user}
          onClose={() => setDetailLoad(null)}
          onUpdated={(l) => setDetailLoad(l)}
          onDeleted={() => setDetailLoad(null)}
          onAssign={() => {}}
          onEdit={() => {}}
        />
      )}
    </div>
  );
}
