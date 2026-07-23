"use client";

import { useRef, useState } from "react";
import { RouteLine } from "@/components/RouteLine";
import { StatusPill, Drawer, PanelHead, Button, Icon, IconButton, ConfirmDialog } from "@/components/ui";
import { useToast } from "@/components/ui";
import { fmtMoney, fmtDateTime, fmtBytes, fmtRelative, statusLabel, payoutLabel } from "@/lib/format";
import { api, uploadFile, ApiRequestError } from "@/lib/api-client";
import type { Load, LoadDocument, SessionUser, DocumentType } from "@/types";

const STATUSES = ["DRAFT", "ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"] as const;
const REQUIRES_ASSIGNMENT = new Set(["ASSIGNED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "BILLED"]);
const DOC_TYPES: DocumentType[] = ["BOL", "POD", "RATE_CONFIRMATION"];
const DOC_LABELS: Record<DocumentType, string> = { BOL: "BOL", POD: "POD", RATE_CONFIRMATION: "Rate Confirmation" };
const ACCEPTED_EXT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

function DocumentSlot({
  loadId,
  type,
  label,
  docs,
  canDelete,
  onChanged,
}: {
  loadId: string;
  type: DocumentType;
  label: string;
  docs: LoadDocument[];
  canDelete: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);

  const current = docs[0] ?? null;
  const history = docs.slice(1);

  async function doUpload(file: File) {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    setUploading(true);
    setProgress(0);
    try {
      await uploadFile(`/api/loads/${loadId}/documents`, formData, setProgress);
      toast.success(label + " uploaded.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(docId: string) {
    try {
      await api.del(`/api/loads/${loadId}/documents/${docId}`);
      toast.info("Document removed.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Only Admin can remove documents.");
    }
  }

  const fileUrl = (docId: string) => `/api/loads/${loadId}/documents/${docId}`;

  return (
    <div
      className={"doc-slot" + (dragOver ? " drag-over" : "")}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) doUpload(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT}
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) doUpload(f); }}
      />

      <div className="doc-slot-head">
        <span className="doc-slot-label">{label}</span>
        {current && !uploading && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()}>Replace</button>
        )}
      </div>

      {uploading ? (
        <div className="doc-slot-progress">
          <div className="doc-slot-progress-track"><div className="doc-slot-progress-bar" style={{ width: progress + "%" }} /></div>
          <span className="mono">{progress}%</span>
        </div>
      ) : current ? (
        <div className="doc-slot-file">
          {current.mimeType.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <a href={fileUrl(current.id)} target="_blank" rel="noreferrer" className="doc-thumb">
              <img src={fileUrl(current.id)} alt={current.fileName} />
            </a>
          ) : (
            <a href={fileUrl(current.id)} target="_blank" rel="noreferrer" className="doc-thumb doc-thumb-pdf">
              <Icon name="fileText" size={18} />
            </a>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <a href={fileUrl(current.id)} target="_blank" rel="noreferrer" className="doc-slot-filename">{current.fileName}</a>
            <div className="doc-slot-meta">
              {fmtBytes(current.fileSizeBytes)} · {fmtRelative(current.uploadedAt)}{current.uploadedBy ? " · " + current.uploadedBy.name : ""}
            </div>
            {history.length > 0 && (
              <button type="button" className="doc-slot-history-toggle" onClick={() => setShowHistory((s) => !s)}>
                {showHistory ? "Hide" : "View"} {history.length} earlier version{history.length === 1 ? "" : "s"}
              </button>
            )}
          </div>
          {canDelete && <IconButton icon="trash" title="Delete this version" onClick={() => removeDoc(current.id)} />}
        </div>
      ) : (
        <div className="doc-slot-empty" onClick={() => inputRef.current?.click()}>
          <Icon name="upload" size={15} />
          <span>Drop file or click to upload</span>
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div className="doc-slot-history">
          {history.map((d) => (
            <div key={d.id} className="doc-slot-history-item">
              <a href={fileUrl(d.id)} target="_blank" rel="noreferrer">{d.fileName}</a>
              <span className="doc-slot-meta">{fmtBytes(d.fileSizeBytes)} · {fmtRelative(d.uploadedAt)}</span>
              {canDelete && <IconButton icon="trash" title="Delete this version" onClick={() => removeDoc(d.id)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const idx = STATUSES.indexOf(load.status);
  const nextStatus = idx >= 0 && idx < STATUSES.length - 1 ? STATUSES[idx + 1] : null;
  const prevStatus = idx > 0 ? STATUSES[idx - 1] : null;

  async function refreshLoad() {
    const res = await api.get<{ load: Load }>(`/api/loads/${load.id}`);
    onUpdated(res.load);
  }

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
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {DOC_TYPES.map((type) => (
            <DocumentSlot
              key={type}
              loadId={load.id}
              type={type}
              label={DOC_LABELS[type]}
              docs={load.documents.filter((d) => d.type === type)}
              canDelete={user.role === "ADMIN"}
              onChanged={refreshLoad}
            />
          ))}
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
