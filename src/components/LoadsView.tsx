"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill, EmptyState, useToast } from "@/components/ui";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { AssignModal } from "@/components/modals/AssignModal";
import { LoadFormModal } from "@/components/modals/LoadFormModal";
import { fmtMoney, fmtDate, statusLabel } from "@/lib/format";
import type { Load, Customer, Driver, Equipment, SessionUser, LoadStatus } from "@/types";

const STATUSES: LoadStatus[] = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"];

export function LoadsView({
  user,
  initialLoads,
  customers,
  drivers,
  equipment,
}: {
  user: SessionUser;
  initialLoads: Load[];
  customers: Customer[];
  drivers: Driver[];
  equipment: Equipment[];
}) {
  const [loads, setLoads] = useState(initialLoads);
  useEffect(() => setLoads(initialLoads), [initialLoads]);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | LoadStatus>("All");
  const [detailLoadId, setDetailLoadId] = useState<string | null>(null);
  const [assignLoad, setAssignLoad] = useState<Load | null>(null);
  const [editLoad, setEditLoad] = useState<Load | null>(null);

  const toast = useToast();
  const router = useRouter();

  function patchLocal(updated: Load) {
    setLoads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }
  function removeLocal(id: string) {
    setLoads((prev) => prev.filter((l) => l.id !== id));
  }

  const filtered = useMemo(() => {
    return loads
      .filter((l) => (statusFilter === "All" ? true : l.status === statusFilter))
      .filter((l) => {
        if (!q.trim()) return true;
        const hay = [l.loadNumber, l.origin, l.destination, l.customer.companyName].join(" ").toLowerCase();
        return hay.includes(q.toLowerCase());
      })
      .sort((a, b) => new Date(b.pickupTime).getTime() - new Date(a.pickupTime).getTime());
  }, [loads, q, statusFilter]);

  const detailLoad = detailLoadId ? loads.find((l) => l.id === detailLoadId) ?? null : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="search-box" style={{ width: 280 }}>
          <SearchIcon />
          <input placeholder="Search loads, routes, customers…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input" style={{ width: 170 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "All" | LoadStatus)}>
          <option value="All">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <EmptyState icon="list" title="No loads match" hint="Try a different search or filter, or create a new load." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Load</th>
                  <th>Customer</th>
                  <th>Route</th>
                  <th>Pickup</th>
                  <th>Delivery</th>
                  <th>Status</th>
                  <th>Driver</th>
                  <th style={{ textAlign: "right" }}>Rate</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} onClick={() => setDetailLoadId(l.id)}>
                    <td className="mono" style={{ fontWeight: 600 }}>{l.loadNumber}</td>
                    <td>{l.customer.companyName}</td>
                    <td>{l.origin} → {l.destination}</td>
                    <td>{fmtDate(l.pickupTime)}</td>
                    <td>{fmtDate(l.deliveryTime)}</td>
                    <td><StatusPill status={l.status} label={statusLabel(l.status)} /></td>
                    <td>{l.driver ? l.driver.firstName + " " + l.driver.lastName : <span style={{ color: "var(--muted)" }}>Unassigned</span>}</td>
                    <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{fmtMoney(l.rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
        />
      )}

      {assignLoad && (
        <AssignModal
          load={assignLoad}
          loads={loads}
          drivers={drivers}
          equipment={equipment}
          onClose={() => setAssignLoad(null)}
          onSaved={(l) => { patchLocal(l); setAssignLoad(null); toast.success(l.loadNumber + " assigned."); }}
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
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  );
}
