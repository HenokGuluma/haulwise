"use client";

import { useRef, useState } from "react";
import { RouteLine } from "@/components/RouteLine";
import { StatusPill, Drawer, PanelHead, Button, Icon, ConfirmDialog } from "@/components/ui";
import { useToast } from "@/components/ui";
import { fmtMoney, fmtDateTime, statusLabel, payoutLabel } from "@/lib/format";
import { api, ApiRequestError } from "@/lib/api-client";
import type { Load, SessionUser, DocumentType } from "@/types";

const STATUSES = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"] as const;
const REQUIRES_ASSIGNMENT = new Set(["ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"]);
const DOC_TYPES: DocumentType[] = ["BOL", "POD", "RATE_CONFIRMATION"];
const DOC_LABELS: Record<DocumentType, string> = { BOL: "BOL", POD: "POD", RATE_CONFIRMATION: "Rate Confirmation" };

export function LoadDetailDrawer({
  load,
  user,
  onClose,
  onUpdated,
  onDeleted,
  onAssign,
  onEdit,
}: {
  load: Load;
  user: SessionUser;
  onClose: () => void;
  onUpdated: (load: Load) => void;
  onDeleted: () => void;
  onAssign: (load: Load) => void;
  onEdit: (load: Load) => void;
}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDocType, setPendingDocType] = useState<DocumentType | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const idx = STATUSES.indexOf(load.status);
  const nextStatus = idx >= 0 && idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;
  const prevStatus = idx > 0 ? STATUSES[idx - 1] : null;

  async function advance() {
    if (!nextStatus) return;
    if (REQUIRES_ASSIGNMENT.has(nextStatus) && (!load.driverId || !load.equipmentId)) {
      toast.error("Assign a driver and equipment before moving to " + statusLabel(nextStatus) + ".");
      onAssign(load);
      return;
    }
    setBusy(true);
    try {
      const res = await api.patch<{ load: Load }>(`/api/loads/${load.id}`, { status: nextStatus });
      onUpdated(res.load);
      toast.success(load.loadNumber + " moved to " + statusLabel(nextStatus) + ".");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't update status.");
    } finally {
      setBusy(false);
    }
  }

  async function goBack() {
    if (!prevStatus) return;
    setBusy(true);
    try {
      const res = await api.patch<{ load: Load }>(`/api/loads/${load.id}`, { status: prevStatus });
      onUpdated(res.load);
      toast.info(load.loadNumber + " moved back to " + statusLabel(prevStatus) + ".");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't update status.");
    } finally {
      setBusy(false);
    }
  }

  function triggerUpload(type: DocumentType) {
    setPendingDocType(type);
    fileInputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pendingDocType) return;
    try {
      await api.post(`/api/loads/${load.id}/documents`, { type: pendingDocType, fileName: file.name });
      const res = await api.get<{ load: Load }>(`/api/loads/${load.id}`);
      onUpdated(res.load);
      toast.success(DOC_LABELS[pendingDocType] + " attached to " + load.loadNumber + ".");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Upload failed.");
    } finally {
      setPendingDocType(null);
    }
  }

  async function removeDoc(type: DocumentType) {
    try {
      await api.del(`/api/loads/${load.id}/documents?type=${type}`);
      const res = await api.get<{ load: Load }>(`/api/loads/${load.id}`);
      onUpdated(res.load);
      toast.info(DOC_LABELS[type] + " removed.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Only Admin can remove documents.");
    }
  }

  async function togglePayout() {
    const next = load.payoutStatus === "PAID" ? "PENDING" : "PAID";
    try {
      const res = await api.patch<{ load: Load }>(`/api/loads/${load.id}`, { payoutStatus: next });
      onUpdated(res.load);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Only Admin can update payout status.");
    }
  }

  async function handleDelete() {
    try {
      await api.del(`/api/loads/${load.id}`);
      onDeleted();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't delete load.");
    }
  }

  return (
    <Drawer onClose={onClose} width={480}>
      <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFile} />
      <PanelHead title={load.loadNumber} sub={load.customer.companyName} onClose={onClose} />
      <div className="panel-body">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <StatusPill status={load.status} label={statusLabel(load.status)} />
          {prevStatus && <Button size="sm" variant="ghost" onClick={goBack} disabled={busy}>← {statusLabel(prevStatus)}</Button>}
          {nextStatus && (
            <Button size="sm" variant="dark" onClick={advance} disabled={busy}>
              Advance to {statusLabel(nextStatus)} <Icon name="arrowRight" size={13} />
            </Button>
          )}
        </div>

        <RouteLine status={load.status} pickup={load.pickupTime} delivery={load.deliveryTime} />

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 10 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{load.origin}</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{fmtDateTime(load.pickupTime)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700 }}>{load.destination}</div>
            <div style={{ color: "var(--muted)", fontSize: 12 }}>{fmtDateTime(load.deliveryTime)}</div>
          </div>
        </div>

        <div className="divider"></div>

        <div className="section-title">Load details</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 16 }}>
          <div><div style={{ color: "var(--muted)", fontSize: 11.5 }}>Commodity</div>{load.commodity}</div>
          <div><div style={{ color: "var(--muted)", fontSize: 11.5 }}>Weight</div>{load.weight.toLocaleString()} lbs</div>
          <div><div style={{ color: "var(--muted)", fontSize: 11.5 }}>Equipment type</div>{load.equipmentTypeCode}</div>
          <div><div style={{ color: "var(--muted)", fontSize: 11.5 }}>Rate</div><span className="mono" style={{ fontWeight: 700 }}>{fmtMoney(load.rate)}</span></div>
        </div>

        <div className="section-title">Assignment</div>
        <div className="card" style={{ padding: 12, marginBottom: 16 }}>
          {load.driver || load.equipment ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{load.driver ? load.driver.firstName + " " + load.driver.lastName : "No driver"}</div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>{load.equipment ? load.equipment.unitNumber : "No equipment"}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => onAssign(load)}>Reassign</Button>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Not yet assigned</span>
              <Button size="sm" variant="primary" onClick={() => onAssign(load)}>Assign</Button>
            </div>
          )}
        </div>

        <div className="section-title">Documents</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {DOC_TYPES.map((type) => {
            const doc = load.documents.find((d) => d.type === type);
            return doc ? (
              <span key={type} className="doc-chip filled">
                <Icon name="checkCircle" /> {DOC_LABELS[type]}
                <button onClick={() => removeDoc(type)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, marginLeft: 3, display: "flex" }} title="Remove">
                  <Icon name="x" size={11} />
                </button>
              </span>
            ) : (
              <button key={type} className="doc-chip" style={{ cursor: "pointer", border: "1px dashed var(--line)" }} onClick={() => triggerUpload(type)}>
                <Icon name="upload" /> Upload {DOC_LABELS[type]}
              </button>
            );
          })}
        </div>

        <div className="section-title">Billing</div>
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
            <span style={{ color: "var(--muted)" }}>Driver pay</span>
            <span className="mono" style={{ fontWeight: 600 }}>{fmtMoney(load.driverPay)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
            <span style={{ color: "var(--muted)" }}>Payout status</span>
            <span
              className={"pill " + (load.payoutStatus === "PAID" ? "pill-success" : load.payoutStatus === "PENDING" ? "pill-warning" : "pill-muted")}
              style={{ cursor: user.role === "ADMIN" ? "pointer" : "default" }}
              onClick={togglePayout}
              title={user.role === "ADMIN" ? "Click to toggle" : "Admin only"}
            >
              {payoutLabel(load.payoutStatus)}
            </span>
          </div>
        </div>
      </div>
      <div className="panel-foot">
        {user.role === "ADMIN" && (
          <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)}>Delete</Button>
        )}
        <Button variant="ghost" onClick={() => onEdit(load)}>Edit details</Button>
        <Button variant="dark" onClick={onClose}>Done</Button>
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title="Delete load"
          message={`Permanently delete ${load.loadNumber}? This cannot be undone.`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </Drawer>
  );
}
