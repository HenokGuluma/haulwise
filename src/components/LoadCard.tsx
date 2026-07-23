"use client";

import { useState } from "react";
import { RouteLine } from "@/components/RouteLine";
import { Icon } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/format";
import type { Load, Driver, Equipment, LoadStatus, EquipmentTypeCode } from "@/types";

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

// A small visual identity per equipment type — icon + tone — so a column of
// cards reads at a glance instead of requiring the type-code text every time.
const EQUIPMENT_VISUAL: Record<EquipmentTypeCode, { icon: string; tone: string; label: string }> = {
  V: { icon: "box", tone: "van", label: "Dry Van" },
  R: { icon: "snowflake", tone: "reefer", label: "Reefer" },
  F: { icon: "layers", tone: "flatbed", label: "Flatbed" },
  PO: { icon: "zap", tone: "power", label: "Power Only" },
};

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

  const visual = EQUIPMENT_VISUAL[load.equipmentTypeCode];

  return (
    <div
      className={"load-card" + (dragging ? " dragging" : "")}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      <div className="lc-top">
        <span className={"lc-equip-badge lc-equip-" + visual.tone} title={visual.label}>
          <Icon name={visual.icon} size={15} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lc-id mono">{load.loadNumber}</div>
          <div className="lc-customer">{load.customer?.companyName ?? "Deleted customer"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
          <span className="lc-rate mono">{fmtMoney(load.rate)}</span>
          <span className="dt-menu-anchor" onClick={(e) => e.stopPropagation()}>
            <button
              className="icon-btn"
              style={{ width: 20, height: 20 }}
              title="Move to… (keyboard alternative to drag-and-drop)"
              aria-label="Move to another status"
              onClick={() => setMoveMenuOpen((o) => !o)}
            >
              <Icon name="chevronDown" size={12} />
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
        </div>
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
      <div className="lc-assign">
        {load.driver ? (
          <>
            <span className="lc-avatar">{initials(load.driver.firstName, load.driver.lastName)}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{load.driver.firstName} {load.driver.lastName}</span>
            {load.equipment && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }} className="mono">{load.equipment.unitNumber}</span>}
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
              aria-label="Confirm quick assign"
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
