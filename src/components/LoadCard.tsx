"use client";

import { RouteLine } from "@/components/RouteLine";
import { Icon } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/format";
import type { Load } from "@/types";

function initials(a: string, b: string) {
  return (a?.[0] || "").toUpperCase() + (b?.[0] || "").toUpperCase();
}

export function LoadCard({
  load,
  onOpen,
  onAssign,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  load: Load;
  onOpen: () => void;
  onAssign: () => void;
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
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
        <span className="lc-rate mono">{fmtMoney(load.rate)}</span>
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
        <span>{load.customer.companyName} · {load.equipmentTypeCode}</span>
      </div>
      <div className="lc-assign">
        {load.driver ? (
          <>
            <span className="lc-avatar">{initials(load.driver.firstName, load.driver.lastName)}</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{load.driver.firstName} {load.driver.lastName}</span>
            {load.equipment && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>{load.equipment.unitNumber}</span>}
          </>
        ) : (
          <button className="lc-unassigned" onClick={(e) => { e.stopPropagation(); onAssign(); }}>
            + Assign driver
          </button>
        )}
      </div>
    </div>
  );
}
