"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, useToast } from "@/components/ui";
import { DataTable, type FetchPageParams } from "@/components/DataTable";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { fmtMoney, fmtBytes, fmtDate, fmtDateTime, payoutLabel } from "@/lib/format";
import { api, fetchTablePage, ApiRequestError } from "@/lib/api-client";
import type { Load, SessionUser, DocumentType, PayoutStatus } from "@/types";

type AgingRow = { id: string; loadNumber: string; customerName: string; deliveryTime: string; driverPay: number; amountPaid: number; remaining: number; daysSinceDelivery: number };
type AgingBuckets = { "0-15": AgingRow[]; "15-30": AgingRow[]; "30+": AgingRow[] };

function AgingBucketCard({ title, rows, tone }: { title: string; rows: AgingRow[]; tone: "success" | "warning" | "danger" }) {
  const total = rows.reduce((s, r) => s + r.remaining, 0);
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span className={"pill pill-" + tone}>{title}</span>
        <span className="mono" style={{ fontWeight: 700 }}>{fmtMoney(total)}</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Nothing in this range.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
              <div>
                <div className="mono" style={{ fontWeight: 600 }}>{r.loadNumber}</div>
                <div style={{ color: "var(--muted)", fontSize: 11 }}>{r.customerName} · delivered {fmtDate(r.deliveryTime)}</div>
              </div>
              <span className="mono">{fmtMoney(r.remaining)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AgingView() {
  const [buckets, setBuckets] = useState<AgingBuckets | null>(null);

  useEffect(() => {
    api.get<{ buckets: AgingBuckets }>("/api/billing/aging").then((res) => setBuckets(res.buckets)).catch(() => {});
  }, []);

  if (!buckets) return <div style={{ fontSize: 13, color: "var(--muted)" }}>Loading…</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
      <AgingBucketCard title="0–15 days" rows={buckets["0-15"]} tone="success" />
      <AgingBucketCard title="15–30 days" rows={buckets["15-30"]} tone="warning" />
      <AgingBucketCard title="30+ days" rows={buckets["30+"]} tone="danger" />
    </div>
  );
}

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
const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "BOL", label: "BOL" },
  { value: "POD", label: "POD" },
  { value: "RATE_CONFIRMATION", label: "Rate Confirmation" },
];

type DocumentLibraryRow = {
  id: string;
  type: DocumentType;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: { id: string; name: string } | null;
  load: { id: string; loadNumber: string; customer: { companyName: string } | null };
};

function DocumentLibrary() {
  const fetchPage = useCallback((params: FetchPageParams) => fetchTablePage<DocumentLibraryRow>("/api/documents", params), []);

  return (
    <DataTable<DocumentLibraryRow>
      tableId="document-library"
      fetchPage={fetchPage}
      rowKey={(d) => d.id}
      onRowClick={(d) => window.open(`/api/loads/${d.load.id}/documents/${d.id}`, "_blank")}
      searchPlaceholder="Search files, load numbers, customers…"
      emptyIcon="fileText"
      emptyTitle="No documents uploaded yet"
      emptyHint="Documents uploaded to any load will show up here."
      csvFilename="haulwise-document-library.csv"
      initialSort={{ by: "uploadedAt", dir: "desc" }}
      columns={[
        { key: "loadNumber", label: "Load", render: (d) => <span className="mono" style={{ fontWeight: 600 }}>{d.load.loadNumber}</span>, exportValue: (d) => d.load.loadNumber },
        { key: "customer", label: "Customer", render: (d) => d.load.customer?.companyName ?? "Deleted customer", exportValue: (d) => d.load.customer?.companyName ?? "Deleted customer" },
        {
          key: "type",
          label: "Type",
          sortable: true,
          filterOptions: DOC_TYPE_OPTIONS,
          render: (d) => DOC_TYPE_OPTIONS.find((o) => o.value === d.type)?.label ?? d.type,
        },
        { key: "fileName", label: "File", render: (d) => <span style={{ color: "var(--accent)" }}>{d.fileName}</span> },
        { key: "uploadedAt", label: "Uploaded", sortable: true, render: (d) => fmtDateTime(d.uploadedAt), exportValue: (d) => fmtDateTime(d.uploadedAt) },
        { key: "uploadedBy", label: "Uploaded By", render: (d) => d.uploadedBy?.name ?? "—", exportValue: (d) => d.uploadedBy?.name ?? "" },
        { key: "fileSizeBytes", label: "Size", sortable: true, align: "right", render: (d) => fmtBytes(d.fileSizeBytes), exportValue: (d) => d.fileSizeBytes },
      ]}
    />
  );
}

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
  const [tab, setTab] = useState<"ledger" | "library" | "aging">("ledger");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

      <div className="tabbar">
        <button className={"tab" + (tab === "ledger" ? " active" : "")} onClick={() => setTab("ledger")}>Billing Ledger</button>
        <button className={"tab" + (tab === "library" ? " active" : "")} onClick={() => setTab("library")}>Document Library</button>
        <button className={"tab" + (tab === "aging" ? " active" : "")} onClick={() => setTab("aging")}>Aging</button>
      </div>

      {tab === "ledger" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Delivery date range:</span>
          <input type="date" className="input" style={{ width: 150 }} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span style={{ color: "var(--muted)" }}>–</span>
          <input type="date" className="input" style={{ width: 150 }} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <div style={{ marginLeft: "auto" }}>
            <a href={`/api/billing${dateFrom || dateTo ? `?from=${dateFrom}&to=${dateTo}` : ""}`} download>
              <Button variant="dark" icon="download">Export {dateFrom || dateTo ? "Range" : "Full Ledger"} CSV</Button>
            </a>
          </div>
        </div>
      )}

      {tab === "library" ? (
        <DocumentLibrary />
      ) : tab === "aging" ? (
        <AgingView />
      ) : (
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
          { key: "customer", label: "Customer", sortable: true, render: (l) => l.customer?.companyName ?? "Deleted customer", exportValue: (l) => l.customer?.companyName ?? "Deleted customer" },
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
      )}

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
