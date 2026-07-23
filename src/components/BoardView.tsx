"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadCard } from "@/components/LoadCard";
import { useToast } from "@/components/ui";
import { AssignModal } from "@/components/modals/AssignModal";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { LoadFormModal } from "@/components/modals/LoadFormModal";
import { fmtMoney } from "@/lib/format";
import { api, ApiRequestError } from "@/lib/api-client";
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
const REQUIRES_ASSIGNMENT = new Set<LoadStatus>(["ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"]);

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

  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<LoadStatus | null>(null);
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

  async function handleDrop(status: LoadStatus, e: React.DragEvent) {
    setOverCol(null);
    const id = e.dataTransfer.getData("text/plain") || dragId;
    if (!id) return;
    const load = loads.find((l) => l.id === id);
    setDragId(null);
    if (!load || load.status === status) return;

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

  const detailLoad = detailLoadId ? loads.find((l) => l.id === detailLoadId) ?? null : null;

  return (
    <div>
      <div className="board-scroll">
        {STATUSES.map((status) => {
          const items = loads
            .filter((l) => l.status === status)
            .sort((a, b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime());
          const total = items.reduce((s, l) => s + l.rate, 0);
          return (
            <div key={status} className="board-col">
              <div className="board-col-head">
                <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block" }} className="pill-dot" />
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
                    dragging={dragId === load.id}
                    onOpen={() => setDetailLoadId(load.id)}
                    onAssign={() => setAssignLoad(load)}
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
