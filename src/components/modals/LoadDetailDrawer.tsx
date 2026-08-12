"use client";

import { useEffect, useRef, useState } from "react";
import { RouteLine } from "@/components/RouteLine";
import { StatusPill, Drawer, PanelHead, Button, Icon, IconButton, ConfirmDialog } from "@/components/ui";
import { useToast } from "@/components/ui";
import { PaymentLogModal } from "@/components/modals/PaymentLogModal";
import { fmtMoney, fmtWeight, fmtDateTime, fmtBytes, fmtRelative, statusLabel } from "@/lib/format";
import { api, uploadFile, ApiRequestError } from "@/lib/api-client";
import { notifyDataChange } from "@/lib/data-events";
import { RATE_TYPE_META, rateBasisQuantity } from "@/lib/rate-calc";
import type { Load, LoadDocument, LoadActivityRow, LoadCommentRow, PaymentRow, SessionUser, DocumentType } from "@/types";

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
  canUpload,
  onChanged,
}: {
  loadId: string;
  type: DocumentType;
  label: string;
  docs: LoadDocument[];
  canDelete: boolean;
  canUpload: boolean;
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
      toast.error(err instanceof ApiRequestError ? err.message : "You don't have permission to remove documents.");
    }
  }

  const fileUrl = (docId: string) => `/api/loads/${loadId}/documents/${docId}`;

  return (
    <div
      className={"doc-slot" + (dragOver ? " drag-over" : "")}
      onDragOver={canUpload ? (e) => { e.preventDefault(); setDragOver(true); } : undefined}
      onDragLeave={canUpload ? () => setDragOver(false) : undefined}
      onDrop={canUpload ? (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) doUpload(file);
      } : undefined}
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
        {canUpload && current && !uploading && (
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
      ) : canUpload ? (
        <div className="doc-slot-empty" onClick={() => inputRef.current?.click()}>
          <Icon name="upload" size={15} />
          <span>Drop file or click to upload</span>
        </div>
      ) : (
        <div className="doc-slot-empty" style={{ cursor: "default" }}>
          <span style={{ color: "var(--muted)" }}>Not yet uploaded</span>
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

const ACTIVITY_ICONS: Record<string, string> = {
  CREATED: "plus",
  STATUS_CHANGE: "arrowRight",
  ASSIGNED: "users",
  DOCUMENT_UPLOADED: "upload",
  PAYOUT_CHANGE: "checkCircle",
  PAYMENT_LOGGED: "checkCircle",
  UPDATED: "edit",
};

function ActivityTimeline({ loadId }: { loadId: string }) {
  const toast = useToast();
  const [activities, setActivities] = useState<LoadActivityRow[]>([]);
  const [comments, setComments] = useState<LoadCommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<{ activities: LoadActivityRow[]; comments: LoadCommentRow[] }>(`/api/loads/${loadId}/activity`);
      setActivities(res.activities);
      setComments(res.comments);
    } catch {
      // non-critical panel — fail quietly, the rest of the drawer still works
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [loadId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function postComment() {
    if (!commentBody.trim()) return;
    setPosting(true);
    try {
      await api.post(`/api/loads/${loadId}/comments`, { body: commentBody.trim() });
      setCommentBody("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't post comment.");
    } finally {
      setPosting(false);
    }
  }

  type TimelineItem = { id: string; kind: "activity" | "comment"; createdAt: string; node: React.ReactNode };
  const items: TimelineItem[] = [
    ...activities.map((a) => ({
      id: "a" + a.id,
      kind: "activity" as const,
      createdAt: a.createdAt,
      node: (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Icon name={ACTIVITY_ICONS[a.type] ?? "clock"} size={13} style={{ marginTop: 2, color: "var(--muted)", flexShrink: 0 }} />
          <div style={{ fontSize: 12.5 }}>
            <div>{a.message}</div>
            <div style={{ color: "var(--muted)", fontSize: 11 }}>{a.actorUser?.name ?? "System"} · {fmtRelative(a.createdAt)}</div>
          </div>
        </div>
      ),
    })),
    ...comments.map((c) => ({
      id: "c" + c.id,
      kind: "comment" as const,
      createdAt: c.createdAt,
      node: (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span className="lc-avatar" style={{ width: 22, height: 22, fontSize: 9, flexShrink: 0 }}>
            {c.authorUser.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
          </span>
          <div style={{ fontSize: 12.5, flex: 1 }}>
            <div style={{ color: "var(--ink-soft)" }}>{c.body}</div>
            <div style={{ color: "var(--muted)", fontSize: 11 }}>{c.authorUser.name} · {fmtRelative(c.createdAt)}</div>
          </div>
        </div>
      ),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div>
      <div className="section-title">Activity & Comments</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          className="input"
          placeholder="Leave a note for other dispatchers…"
          value={commentBody}
          onChange={(e) => setCommentBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") postComment(); }}
        />
        <Button size="sm" variant="dark" onClick={postComment} disabled={posting || !commentBody.trim()}>Post</Button>
      </div>
      {loading ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>No activity yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }}>
          {items.map((it) => <div key={it.id}>{it.node}</div>)}
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
  onClone,
}: {
  load: Load;
  user: SessionUser;
  onClose: () => void;
  onUpdated: (load: Load) => void;
  onDeleted: () => void;
  onAssign: (load: Load) => void;
  onEdit: (load: Load) => void;
  onClone?: (load: Load) => void;
}) {
  const toast = useToast();
  const isCustomer = user.isCustomerScoped;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  useEffect(() => {
    if (isCustomer) return;
    api.get<{ payments: PaymentRow[] }>(`/api/loads/${load.id}/payments`).then((res) => setPayments(res.payments)).catch(() => {});
  }, [load.id, isCustomer]);

  const amountPaid = payments.reduce((s, p) => s + p.amount, 0);
  const remaining = Math.max(0, load.driverPay - amountPaid);
  const computedStatus = amountPaid <= 0 ? "Not Billed" : amountPaid >= load.driverPay ? "Paid" : "Partially Paid";

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
    if (nextStatus === "BILLED") {
      const missing = [
        load.documents.some((d) => d.type === "BOL") ? null : "BOL",
        load.documents.some((d) => d.type === "POD") ? null : "POD",
      ].filter(Boolean);
      if (missing.length > 0) {
        toast.error(`Upload the ${missing.join(" and ")} document${missing.length > 1 ? "s" : ""} before billing this load.`);
        return;
      }
      if (amountPaid < load.driverPay) {
        toast.error("Log the driver payment in full before billing this load.");
        return;
      }
    }
    setBusy(true);
    try {
      const res = await api.patch<{ load: Load }>(`/api/loads/${load.id}`, { status: nextStatus });
      onUpdated(res.load);
      // Crossing into/out of delivered/billed changes what the sidebar's
      // Dispatch Board badge counts, even though the total load count
      // itself hasn't changed.
      notifyDataChange("loads");
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
      notifyDataChange("loads");
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
      toast.error(err instanceof ApiRequestError ? err.message : "You don't have permission to update payout status.");
    }
  }

  async function handleDelete() {
    try {
      await api.del(`/api/loads/${load.id}`);
      notifyDataChange("loads");
      onDeleted();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't delete load.");
    }
  }

  return (
    <Drawer onClose={onClose} width={640}>
      <PanelHead title={load.loadNumber} sub={load.customer?.companyName ?? "Deleted customer"} onClose={onClose} />
      <div className="panel-body">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <StatusPill status={load.status} label={statusLabel(load.status)} />
          {!isCustomer && prevStatus && <Button size="sm" variant="ghost" onClick={goBack} disabled={busy}>← {statusLabel(prevStatus)}</Button>}
          {!isCustomer && nextStatus && (
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
          <div><div style={{ color: "var(--muted)", fontSize: 11.5 }}>Weight</div>{fmtWeight(load.weight)}</div>
          <div><div style={{ color: "var(--muted)", fontSize: 11.5 }}>Equipment type</div>{load.equipmentTypeCode}</div>
          <div><div style={{ color: "var(--muted)", fontSize: 11.5 }}>Rate</div><span className="mono" style={{ fontWeight: 700 }}>{fmtMoney(load.rate)}</span></div>
          {load.rateType !== "FLAT" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div style={{ color: "var(--muted)", fontSize: 11.5 }}>Rate basis</div>
              {RATE_TYPE_META[load.rateType].label}
              {load.rateBasisValue != null && (
                <>
                  {": "}
                  <span className="mono">{fmtMoney(load.rateBasisValue)}</span>
                  {" × "}
                  <span className="mono">
                    {rateBasisQuantity({
                      rateType: load.rateType,
                      weight: load.weight,
                      distanceKm: load.distanceKm,
                      pickupTime: new Date(load.pickupTime),
                      deliveryTime: new Date(load.deliveryTime),
                    })?.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </span>
                  {" "}
                  {load.rateType === "PER_QUINTAL" ? "Quintals" : load.rateType === "PER_KM" ? "km" : "hrs"}
                </>
              )}
            </div>
          )}
        </div>

        <div className="section-title">Assignment</div>
        <div className="card" style={{ padding: 12, marginBottom: 16 }}>
          {load.driver || load.equipment ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13 }}>
                <div style={{ fontWeight: 600 }}>{load.driver ? load.driver.firstName + " " + load.driver.lastName : "No driver"}</div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>{load.equipment ? load.equipment.unitNumber : "No equipment"}</div>
              </div>
              {!isCustomer && <Button size="sm" variant="ghost" onClick={() => onAssign(load)}>Reassign</Button>}
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--muted)" }}>Not yet assigned</span>
              {!isCustomer && <Button size="sm" variant="primary" onClick={() => onAssign(load)}>Assign</Button>}
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
              canDelete={user.permissions.includes("documents:delete")}
              canUpload={!isCustomer}
              onChanged={refreshLoad}
            />
          ))}
        </div>

        {!isCustomer && (
          <>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Billing</div>
              {user.permissions.includes("payments:manage") && remaining > 0 && load.driverId && (
                <button type="button" className="doc-slot-history-toggle" style={{ marginLeft: "auto" }} onClick={() => setPaymentModalOpen(true)}>Log payment</button>
              )}
            </div>
            <div className="card" style={{ padding: 12, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: "var(--muted)" }}>
                  Driver pay
                  {" "}
                  <span style={{ fontSize: 11 }}>
                    ({load.driverPayType === "PERCENTAGE"
                      ? `${load.driverPayValue}% of rate`
                      : load.driverPayType === "PER_UNIT"
                      ? `${fmtMoney(load.driverPayValue)} / ${load.rateType === "PER_QUINTAL" ? "Quintal" : load.rateType === "PER_KM" ? "km" : "hr"}`
                      : "fixed"})
                  </span>
                </span>
                <span className="mono" style={{ fontWeight: 600 }}>{fmtMoney(load.driverPay)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: "var(--muted)" }}>Amount paid</span>
                <span className="mono" style={{ fontWeight: 600 }}>{fmtMoney(amountPaid)}</span>
              </div>
              {remaining > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: "var(--muted)" }}>Remaining</span>
                  <span className="mono" style={{ fontWeight: 600, color: "var(--danger)" }}>{fmtMoney(remaining)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Status</span>
                <span
                  className={"pill " + (computedStatus === "Paid" ? "pill-success" : computedStatus === "Partially Paid" ? "pill-warning" : "pill-muted")}
                  style={{ cursor: user.permissions.includes("payments:manage") && payments.length === 0 ? "pointer" : "default" }}
                  onClick={payments.length === 0 ? togglePayout : undefined}
                  title={user.permissions.includes("payments:manage") && payments.length === 0 ? "Click to toggle (or log a payment for partial amounts)" : undefined}
                >
                  {computedStatus}
                </span>
              </div>
              {payments.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line-soft)", display: "flex", flexDirection: "column", gap: 6 }}>
                  {payments.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)" }}>
                      <span>{fmtDateTime(p.paidAt)}{p.method ? " · " + p.method : ""}</span>
                      <span className="mono">{fmtMoney(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <ActivityTimeline loadId={load.id} />
          </>
        )}
      </div>
      <div className="panel-foot">
        {user.permissions.includes("loads:delete") && (
          <Button variant="danger-ghost" onClick={() => setConfirmDelete(true)}>Delete</Button>
        )}
        <a href={`/loads/${load.id}/print`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
          <Button variant="ghost" icon="fileText">Dispatch Paper</Button>
        </a>
        <a href={`/loads/${load.id}/invoice`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
          <Button variant="ghost" icon="download">Invoice</Button>
        </a>
        {!isCustomer && onClone && <Button variant="ghost" icon="copy" onClick={() => onClone(load)}>Clone</Button>}
        {!isCustomer && <Button variant="ghost" onClick={() => onEdit(load)}>Edit details</Button>}
        <Button variant="dark" onClick={onClose}>Done</Button>
      </div>

      {paymentModalOpen && (
        <PaymentLogModal
          load={load}
          remaining={remaining}
          onClose={() => setPaymentModalOpen(false)}
          onSaved={(l) => {
            onUpdated(l);
            setPaymentModalOpen(false);
            api.get<{ payments: PaymentRow[] }>(`/api/loads/${load.id}/payments`).then((res) => setPayments(res.payments)).catch(() => {});
            toast.success("Payment logged.");
          }}
        />
      )}

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
