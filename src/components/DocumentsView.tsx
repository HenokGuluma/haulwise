"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Button, useToast } from "@/components/ui";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { fmtMoney, payoutLabel } from "@/lib/format";
import { api, ApiRequestError } from "@/lib/api-client";
import type { Load, SessionUser, DocumentType } from "@/types";

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

export function DocumentsView({ user, initialLoads }: { user: SessionUser; initialLoads: Load[] }) {
  const [loads, setLoads] = useState(initialLoads);
  useEffect(() => setLoads(initialLoads), [initialLoads]);
  const [detailLoadId, setDetailLoadId] = useState<string | null>(null);

  const toast = useToast();
  const router = useRouter();

  function patchLocal(updated: Load) {
    setLoads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function togglePayout(load: Load) {
    if (user.role !== "ADMIN") {
      toast.error("Only Admin can update payout status.");
      return;
    }
    const next = load.payoutStatus === "PAID" ? "PENDING" : "PAID";
    try {
      const res = await api.patch<{ load: Load }>(`/api/loads/${load.id}`, { payoutStatus: next });
      patchLocal(res.load);
      toast.success(load.loadNumber + " marked " + payoutLabel(next) + ".");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't update payout status.");
    }
  }

  const totalPay = loads.reduce((s, l) => s + (l.payoutStatus !== "NOT_BILLED" ? l.driverPay : 0), 0);
  const totalPending = loads.filter((l) => l.payoutStatus === "PENDING").reduce((s, l) => s + l.driverPay, 0);
  const withDocs = loads.filter((l) => l.documents.length > 0).length;

  const detailLoad = detailLoadId ? loads.find((l) => l.id === detailLoadId) ?? null : null;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 18 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Payable</div>
          <div className="kpi-value">{fmtMoney(totalPay)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pending Payout</div>
          <div className="kpi-value" style={{ color: totalPending > 0 ? "var(--danger)" : undefined }}>{fmtMoney(totalPending)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Loads With Documents</div>
          <div className="kpi-value">{withDocs} / {loads.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", marginBottom: 12 }}>
        <div style={{ marginLeft: "auto" }}>
          <a href="/api/billing" download>
            <Button variant="dark" icon="download">Export CSV</Button>
          </a>
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Load</th>
                <th>Customer</th>
                <th>Documents</th>
                <th style={{ textAlign: "right" }}>Rate</th>
                <th style={{ textAlign: "right" }}>Driver Pay</th>
                <th>Payout</th>
              </tr>
            </thead>
            <tbody>
              {loads.map((l) => (
                <tr key={l.id}>
                  <td className="mono" style={{ fontWeight: 600, cursor: "pointer" }} onClick={() => setDetailLoadId(l.id)}>{l.loadNumber}</td>
                  <td onClick={() => setDetailLoadId(l.id)} style={{ cursor: "pointer" }}>{l.customer.companyName}</td>
                  <td onClick={() => setDetailLoadId(l.id)} style={{ cursor: "pointer" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <DocChip label="BOL" present={hasDoc(l, "BOL")} />
                      <DocChip label="POD" present={hasDoc(l, "POD")} />
                      <DocChip label="Rate Conf" present={hasDoc(l, "RATE_CONFIRMATION")} />
                    </div>
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>{fmtMoney(l.rate)}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{fmtMoney(l.driverPay)}</td>
                  <td>
                    <span
                      className={"pill " + (l.payoutStatus === "PAID" ? "pill-success" : l.payoutStatus === "PENDING" ? "pill-warning" : "pill-muted")}
                      style={{ cursor: user.role === "ADMIN" ? "pointer" : "default" }}
                      onClick={() => togglePayout(l)}
                      title={user.role === "ADMIN" ? "Click to toggle" : "Admin only"}
                    >
                      {payoutLabel(l.payoutStatus)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detailLoad && (
        <LoadDetailDrawer
          load={detailLoad}
          user={user}
          onClose={() => setDetailLoadId(null)}
          onUpdated={(l) => patchLocal(l)}
          onDeleted={() => { setLoads((prev) => prev.filter((x) => x.id !== detailLoad.id)); setDetailLoadId(null); router.refresh(); }}
          onAssign={() => router.push("/board")}
          onEdit={() => router.push("/loads")}
        />
      )}
    </div>
  );
}
