"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, useToast } from "@/components/ui";
import { DataTable, type FetchPageParams } from "@/components/DataTable";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { fmtMoney, payoutLabel } from "@/lib/format";
import { api, fetchTablePage, ApiRequestError } from "@/lib/api-client";
import type { Load, SessionUser, DocumentType, PayoutStatus } from "@/types";

function DocChip({ label, present }: { label: string; present: boolean }) {
  return (
    <span className={"doc-chip" + (present ? " filled" : "")}>
      <Icon name={present ? "checkCircle" : "fileText"} />
      {label}
    </span>
  );
}

function hasDoc(load: Load, type: DocumentType) {
  return load.documents.some((d) => d.type === type);
}

const PAYOUT_STATUSES: PayoutStatus[] = ["NOT_BILLED", "PENDING", "PAID"];

export function DocumentsView({
  user,
  totals,
}: {
  user: SessionUser;
  initialLoads?: Load[];
  totals: { totalPay: number; totalPending: number; withDocs: number; loadCount: number };
}) {
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const toast = useToast();
  const router = useRouter();

  const fetchPage = useCallback((params: FetchPageParams) => fetchTablePage<Load>("/api/loads", params), []);

  async function togglePayout(load: Load) {
    if (user.role !== "ADMIN") {
      toast.error("Only Admin can update payout status.");
      return;
    }
    const next = load.payoutStatus === "PAID" ? "PENDING" : "PAID";
    try {
      const res = await api.patch<{ load: Load }>(`/api/loads/${load.id}`, { payoutStatus: next });
      toast.success(load.loadNumber + " marked " + payoutLabel(next) + ".");
      setReloadKey((k) => k + 1);
      router.refresh();
      if (detailLoad?.id === load.id) setDetailLoad(res.load);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't update payout status.");
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Payable</div>
          <div className="kpi-value">{fmtMoney(totals.totalPay)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pending Payout</div>
          <div className="kpi-value" style={{ color: totals.totalPending > 0 ? "var(--danger)" : undefined }}>{fmtMoney(totals.totalPending)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Loads With Documents</div>
          <div className="kpi-value">{totals.withDocs} / {totals.loadCount}</div>
        </div>
      </div>

      <div style={{ display: "flex", marginBottom: 12 }}>
        <div style={{ marginLeft: "auto" }}>
          <a href="/api/billing" download>
            <Button variant="dark" icon="download">Export Full Ledger CSV</Button>
          </a>
        </div>
      </div>

      <DataTable<Load>
        tableId="billing-ledger"
        fetchPage={fetchPage}
        reloadKey={reloadKey}
        rowKey={(l) => l.id}
        onRowClick={(l) => setDetailLoad(l)}
        searchPlaceholder="Search loads, customers…"
        emptyIcon="fileText"
        emptyTitle="No loads to bill"
        csvFilename="haulwise-billing.csv"
        initialSort={{ by: "pickupTime", dir: "desc" }}
        columns={[
          {
            key: "loadNumber",
            label: "Load",
            sortable: true,
            render: (l) => <span className="mono" style={{ fontWeight: 600 }}>{l.loadNumber}</span>,
          },
          { key: "customer", label: "Customer", sortable: true, render: (l) => l.customer.companyName, exportValue: (l) => l.customer.companyName },
          {
            key: "documents",
            label: "Documents",
            render: (l) => (
              <div style={{ display: "flex", gap: 6 }}>
                <DocChip label="BOL" present={hasDoc(l, "BOL")} />
                <DocChip label="POD" present={hasDoc(l, "POD")} />
                <DocChip label="Rate Conf" present={hasDoc(l, "RATE_CONFIRMATION")} />
              </div>
            ),
            exportValue: (l) => ["BOL", "POD", "RATE_CONFIRMATION"].filter((t) => hasDoc(l, t as DocumentType)).join("; "),
          },
          { key: "rate", label: "Rate", sortable: true, align: "right", render: (l) => <span className="mono">{fmtMoney(l.rate)}</span>, exportValue: (l) => l.rate },
          { key: "driverPay", label: "Driver Pay", sortable: true, align: "right", render: (l) => <span className="mono">{fmtMoney(l.driverPay)}</span>, exportValue: (l) => l.driverPay },
          {
            key: "payoutStatus",
            label: "Payout",
            sortable: true,
            filterOptions: PAYOUT_STATUSES.map((s) => ({ value: s, label: payoutLabel(s) })),
            render: (l) => (
              <span
                className={"pill " + (l.payoutStatus === "PAID" ? "pill-success" : l.payoutStatus === "PENDING" ? "pill-warning" : "pill-muted")}
                style={{ cursor: user.role === "ADMIN" ? "pointer" : "default" }}
                onClick={(e) => { e.stopPropagation(); togglePayout(l); }}
                title={user.role === "ADMIN" ? "Click to toggle" : "Admin only"}
              >
                {payoutLabel(l.payoutStatus)}
              </span>
            ),
            exportValue: (l) => payoutLabel(l.payoutStatus),
          },
        ]}
      />

      {detailLoad && (
        <LoadDetailDrawer
          load={detailLoad}
          user={user}
          onClose={() => setDetailLoad(null)}
          onUpdated={(l) => { setDetailLoad(l); setReloadKey((k) => k + 1); router.refresh(); }}
          onDeleted={() => { setDetailLoad(null); setReloadKey((k) => k + 1); router.refresh(); }}
          onAssign={() => router.push("/board")}
          onEdit={() => router.push("/loads")}
        />
      )}
    </div>
  );
}
