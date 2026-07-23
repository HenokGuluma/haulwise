"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { StatusPill, IconButton } from "@/components/ui";
import { DataTable, type FetchPageParams } from "@/components/DataTable";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { AssignModal } from "@/components/modals/AssignModal";
import { LoadFormModal } from "@/components/modals/LoadFormModal";
import { fmtMoney, fmtDate, statusLabel } from "@/lib/format";
import { api, fetchTablePage } from "@/lib/api-client";
import type { Load, Customer, Driver, Equipment, SessionUser, LoadStatus } from "@/types";

const STATUSES: LoadStatus[] = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"];
const ACTIVE_STATUSES: LoadStatus[] = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT"];

export function LoadsView({
  user,
  customers,
  drivers,
  equipment,
}: {
  user: SessionUser;
  customers: Customer[];
  drivers: Driver[];
  equipment: Equipment[];
}) {
  const [reloadKey, setReloadKey] = useState(0);
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);
  const [assignLoad, setAssignLoad] = useState<Load | null>(null);
  const [editLoad, setEditLoad] = useState<Load | null>(null);
  const [cloneSource, setCloneSource] = useState<Load | null>(null);
  const [previewLoads, setPreviewLoads] = useState<Load[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Deep-link support: /loads?open=<id> (from the command palette, or a
  // future external link) opens that load's detail drawer directly.
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    api.get<{ load: Load }>(`/api/loads/${openId}`).then((res) => setDetailLoad(res.load)).catch(() => {});
  }, [searchParams]);

  // Lightweight, unpaginated snapshot of active loads used only for the
  // AssignModal's client-side conflict preview — the server re-checks
  // authoritatively in /api/loads/[id]/assign regardless.
  useEffect(() => {
    fetchTablePage<Load>("/api/loads", {
      page: 1,
      pageSize: 500,
      sortBy: null,
      sortDir: "asc",
      search: "",
      filters: { status: ACTIVE_STATUSES },
    })
      .then((res) => setPreviewLoads(res.rows))
      .catch(() => {});
  }, [reloadKey]);

  const fetchPage = useCallback(async (params: FetchPageParams) => {
    return fetchTablePage<Load>("/api/loads", params);
  }, []);

  function refresh() {
    setReloadKey((k) => k + 1);
  }

  return (
    <div>
      <DataTable<Load>
        tableId="loads"
        fetchPage={fetchPage}
        reloadKey={reloadKey}
        rowKey={(l) => l.id}
        onRowClick={(l) => setDetailLoad(l)}
        searchPlaceholder="Search loads, routes, customers…"
        emptyIcon="list"
        emptyTitle="No loads match"
        emptyHint="Try a different search or filter, or create a new load."
        csvFilename="haulwise-loads.csv"
        initialSort={{ by: "pickupTime", dir: "desc" }}
        columns={[
          {
            key: "loadNumber",
            label: "Load",
            sortable: true,
            render: (l) => <span className="mono" style={{ fontWeight: 600 }}>{l.loadNumber}</span>,
          },
          {
            key: "customer",
            label: "Customer",
            sortable: true,
            render: (l) => l.customer?.companyName ?? <span style={{ color: "var(--muted)" }}>Deleted customer</span>,
            exportValue: (l) => l.customer?.companyName ?? "Deleted customer",
          },
          {
            key: "route",
            label: "Route",
            render: (l) => `${l.origin} → ${l.destination}`,
            exportValue: (l) => `${l.origin} -> ${l.destination}`,
          },
          {
            key: "pickupTime",
            label: "Pickup",
            sortable: true,
            render: (l) => fmtDate(l.pickupTime),
            exportValue: (l) => fmtDate(l.pickupTime),
          },
          {
            key: "deliveryTime",
            label: "Delivery",
            sortable: true,
            render: (l) => fmtDate(l.deliveryTime),
            exportValue: (l) => fmtDate(l.deliveryTime),
          },
          {
            key: "status",
            label: "Status",
            sortable: true,
            filterOptions: STATUSES.map((s) => ({ value: s, label: statusLabel(s) })),
            render: (l) => <StatusPill status={l.status} label={statusLabel(l.status)} />,
            exportValue: (l) => statusLabel(l.status),
          },
          {
            key: "driver",
            label: "Driver",
            render: (l) => (l.driver ? l.driver.firstName + " " + l.driver.lastName : <span style={{ color: "var(--muted)" }}>Unassigned</span>),
            exportValue: (l) => (l.driver ? l.driver.firstName + " " + l.driver.lastName : "Unassigned"),
          },
          {
            key: "rate",
            label: "Rate",
            sortable: true,
            align: "right",
            render: (l) => <span className="mono" style={{ fontWeight: 600 }}>{fmtMoney(l.rate)}</span>,
            exportValue: (l) => l.rate,
          },
          {
            key: "actions",
            label: "",
            align: "right",
            render: (l) => (
              <span onClick={(e) => e.stopPropagation()}>
                <IconButton icon="copy" title="Clone load" onClick={() => setCloneSource(l)} />
              </span>
            ),
          },
        ]}
      />

      {detailLoad && (
        <LoadDetailDrawer
          load={detailLoad}
          user={user}
          onClose={() => setDetailLoad(null)}
          onUpdated={(l) => { setDetailLoad(l); refresh(); }}
          onDeleted={() => { setDetailLoad(null); refresh(); router.refresh(); }}
          onAssign={(l) => setAssignLoad(l)}
          onEdit={(l) => { setEditLoad(l); setDetailLoad(null); }}
          onClone={(l) => { setCloneSource(l); setDetailLoad(null); }}
        />
      )}

      {assignLoad && (
        <AssignModal
          load={assignLoad}
          loads={previewLoads}
          drivers={drivers}
          equipment={equipment}
          onClose={() => setAssignLoad(null)}
          onSaved={(l) => { setAssignLoad(null); setDetailLoad((prev) => (prev && prev.id === l.id ? l : prev)); refresh(); }}
        />
      )}

      {editLoad && (
        <LoadFormModal
          mode="edit"
          load={editLoad}
          customers={customers}
          onClose={() => setEditLoad(null)}
          onSaved={(l) => { setEditLoad(null); refresh(); }}
        />
      )}

      {cloneSource && (
        <LoadFormModal
          mode="create"
          prefill={cloneSource}
          customers={customers}
          onClose={() => setCloneSource(null)}
          onSaved={(l) => { setCloneSource(null); refresh(); }}
        />
      )}
    </div>
  );
}
