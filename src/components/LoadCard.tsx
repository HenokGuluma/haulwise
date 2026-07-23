"use client";

import { useState } from "react";
import { RouteLine } from "@/components/RouteLine";
import { Icon } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/format";
import type { Load, Driver, Equipment, LoadStatus } from "@/types";

function initials(a: string, b: string) {
  return (a?.[0] || "").toUpperCase() + (b?.[0] || "").toUpperCase();
}

const STATUS_LABELS: Record<LoadStatus, string> = {
  DRAFT: "Draft",
  ASSIGNED: "Assigned",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In Transit",
  DELIVERED: "Delivered",
  BILLED: "Billed",
};
const ALL_STATUSES: LoadStatus[] = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"];

export function LoadCard({
  load,
  drivers,
  equipment,
  onOpen,
  onAssign,
  onQuickAssign,
  onMoveTo,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  load: Load;
  drivers: Driver[];
  equipment: Equipment[];
  onOpen: () => void;
  onAssign: () => void;
  onQuickAssign: (driverId: string, equipmentId: string) => void;
  onMoveTo: (status: LoadStatus) => void;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [qDriver, setQDriver] = useState("");
  const [qEquipment, setQEquipment] = useState("");
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);

  return (
    <div
      className={"load-card" + (dragging ? " dragging" : "")}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      <div className="lc-top">
        <span className="lc-id mono">{load.loadNumber}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span className="lc-rate mono">{fmtMoney(load.rate)}</span>
          <span className="dt-menu-anchor" onClick={(e) => e.stopPropagation()}>
            <button
              className="icon-btn"
              style={{ width: 20, height: 20 }}
              title="Move to… (keyboard alternative to drag-and-drop)"
              aria-label="Move to another status"
              onClick={() => setMoveMenuOpen((o) => !o)}
            >
              <Icon name="columns" size={11} />
            </button>
            {moveMenuOpen && (
              <div className="dt-menu dt-menu-right">
                {ALL_STATUSES.filter((s) => s !== load.status).map((s) => (
                  <button key={s} type="button" className="dt-menu-item" style={{ width: "100%" }} onClick={() => { onMoveTo(s); setMoveMenuOpen(false); }}>
                    Move to {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </span>
        </span>
      </div>
      <div className="lc-route">
        {load.origin} <span style={{ color: "var(--muted)", fontWeight: 500 }}>→</span> {load.destination}
      </div>
      <RouteLine status={load.status} pickup={load.pickupTime} delivery={load.deliveryTime} />
      <div className="lc-meta">
        <Icon name="calendar" size={12} />
        <span>{fmtDate(load.pickupTime)} → {fmtDate(load.deliveryTime)}</span>
      </div>
      <div className="lc-meta" style={{ marginTop: 3 }}>
        <Icon name="package" size={12} />
        <span>{load.customer?.companyName ?? "Deleted customer"} · {load.equipmentTypeCode}</span>
      </div>
      <div className="lc-assign">
        {load.driver ? (
          <>
            <span className="lc-avatar">{initials(load.driver.firstName, load.driver.lastName)}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{load.driver.firstName} {load.driver.lastName}</span>
            {load.equipment && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{load.equipment.unitNumber}</span>}
          </>
        ) : quickOpen ? (
          <div className="lc-quick-assign" onClick={(e) => e.stopPropagation()}>
            <select className="input" value={qDriver} onChange={(e) => setQDriver(e.target.value)}>
              <option value="">Driver…</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>)}
            </select>
            <select className="input" value={qEquipment} onChange={(e) => setQEquipment(e.target.value)}>
              <option value="">Equipment…</option>
              {equipment.map((e) => <option key={e.id} value={e.id}>{e.unitNumber}</option>)}
            </select>
            <button
              className="icon-btn"
              disabled={!qDriver || !qEquipment}
              onClick={() => { onQuickAssign(qDriver, qEquipment); setQuickOpen(false); setQDriver(""); setQEquipment(""); }}
              title="Confirm"
            >
              <Icon name="checkCircle" size={13} />
            </button>
            <button className="icon-btn" onClick={() => setQuickOpen(false)} title="Cancel" aria-label="Cancel quick assign"><Icon name="x" size={13} /></button>
          </div>
        ) : (
          <>
            <button className="lc-unassigned" onClick={(e) => { e.stopPropagation(); setQuickOpen(true); }}>+ Assign driver</button>
            <button
              className="icon-btn"
              style={{ marginLeft: "auto", width: 24, height: 24 }}
              title="Open full assign dialog"
              onClick={(e) => { e.stopPropagation(); onAssign(); }}
            >
              <Icon name="arrowRight" size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
