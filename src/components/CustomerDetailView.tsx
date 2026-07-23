"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon, Pill, StatusPill, Button, IconButton, ConfirmDialog, useToast } from "@/components/ui";
import { DataTable, type FetchPageParams } from "@/components/DataTable";
import { CustomerFormModal } from "@/components/modals/CustomerFormModal";
import { CustomerContactFormModal } from "@/components/modals/CustomerContactFormModal";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { fmtMoney, fmtDate, fmtBytes, fmtRelative, statusLabel } from "@/lib/format";
import { api, fetchTablePage, uploadFile, ApiRequestError } from "@/lib/api-client";
import type { CustomerWithDetail, CustomerContact, CustomerDocument, SessionUser, Load, CustomerStatus } from "@/types";

const STATUS_LABELS: Record<CustomerStatus, string> = { ACTIVE: "Active", PROSPECT: "Prospect", INACTIVE: "Inactive" };
function statusTone(status: CustomerStatus): "success" | "warning" | "muted" {
  if (status === "ACTIVE") return "success";
  if (status === "PROSPECT") return "warning";
  return "muted";
}

function CustomerDocumentsPanel({
  customerId,
  documents,
  canDelete,
  onChanged,
}: {
  customerId: string;
  documents: CustomerDocument[];
  canDelete: boolean;
  onChanged: () => void;
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function doUpload(file: File) {
    if (!label.trim()) { toast.error("Give this document a label first (e.g. Contract)."); return; }
    const formData = new FormData();
    formData.append("label", label.trim());
    formData.append("file", file);
    setUploading(true);
    setProgress(0);
    try {
      await uploadFile(`/api/customers/${customerId}/documents`, formData, setProgress);
      toast.success("Document uploaded.");
      setLabel("");
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(docId: string) {
    try {
      await api.del(`/api/customers/${customerId}/documents/${docId}`);
      toast.info("Document removed.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Only Admin can remove documents.");
    }
  }

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="section-title">Documents</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input className="input" placeholder="Label (e.g. Contract, Credit Application)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Button variant="ghost" onClick={() => inputRef.current?.click()} disabled={uploading}>Browse…</Button>
      </div>
      <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) doUpload(f); }} />

      <div
        className={"doc-slot" + (dragOver ? " drag-over" : "")}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) doUpload(f); }}
      >
        {uploading ? (
          <div className="doc-slot-progress">
            <div className="doc-slot-progress-track"><div className="doc-slot-progress-bar" style={{ width: progress + "%" }} /></div>
            <span className="mono">{progress}%</span>
          </div>
        ) : (
          <div className="doc-slot-empty" onClick={() => inputRef.current?.click()}>
            <Icon name="upload" size={15} />
            <span>Drop a file here, or browse</span>
          </div>
        )}
      </div>

      {documents.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {documents.map((d) => (
            <div key={d.id} className="doc-slot-file" style={{ padding: "6px 0" }}>
              <div className="doc-thumb doc-thumb-pdf"><Icon name="fileText" size={16} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a href={`/api/customers/${customerId}/documents/${d.id}`} target="_blank" rel="noreferrer" className="doc-slot-filename">{d.label} — {d.fileName}</a>
                <div className="doc-slot-meta">{fmtBytes(d.fileSizeBytes)} · {fmtRelative(d.uploadedAt)}{d.uploadedBy ? " · " + d.uploadedBy.name : ""}</div>
              </div>
              {canDelete && <IconButton icon="trash" title="Delete" onClick={() => removeDoc(d.id)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CustomerDetailView({ user, initialCustomer }: { user: SessionUser; initialCustomer: CustomerWithDetail }) {
  const [customer, setCustomer] = useState(initialCustomer);
  const [tab, setTab] = useState<"overview" | "loads" | "documents">("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [contactForm, setContactForm] = useState<{ open: boolean; contact?: CustomerContact }>({ open: false });
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [notes, setNotes] = useState(initialCustomer.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);
  const [loadsReload, setLoadsReload] = useState(0);

  const router = useRouter();
  const toast = useToast();
  const canDelete = user.role === "ADMIN";

  async function refreshCustomer() {
    const res = await api.get<{ customer: CustomerWithDetail }>(`/api/customers/${customer.id}`);
    setCustomer(res.customer);
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await api.patch(`/api/customers/${customer.id}`, { notes });
      toast.success("Notes saved.");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't save notes.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function deleteContact(id: string) {
    try {
      await api.del(`/api/customers/${customer.id}/contacts/${id}`);
      toast.info("Contact removed.");
      refreshCustomer();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't remove contact.");
    }
  }

  async function deleteCustomer() {
    try {
      await api.del(`/api/customers/${customer.id}`);
      toast.success("Customer deleted.");
      router.push("/customers");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't delete customer.");
    }
  }

  const fetchLoads = useCallback(
    (params: FetchPageParams) => fetchTablePage<Load>("/api/loads", { ...params, filters: { ...params.filters, customerId: [customer.id] } }),
    [customer.id]
  );

  return (
    <div>
      <Link href="/customers" style={{ fontSize: 12.5, color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 14, textDecoration: "none" }}>
        <Icon name="arrowLeft" size={12} /> Back to Customers
      </Link>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>{customer.companyName}</h1>
            <Pill tone={statusTone(customer.status)} dot>{STATUS_LABELS[customer.status]}</Pill>
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>{customer.contactName} · {customer.phone} · {customer.email}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" icon="edit" onClick={() => setEditOpen(true)}>Edit</Button>
          {canDelete && (
            <Button
              variant="danger-ghost"
              icon="trash"
              onClick={() => setConfirm({
                title: "Delete customer",
                message: `Permanently delete ${customer.companyName}? This is blocked while they have active loads. This cannot be undone.`,
                onConfirm: deleteCustomer,
              })}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="tabbar">
        <button className={"tab" + (tab === "overview" ? " active" : "")} onClick={() => setTab("overview")}>Overview</button>
        <button className={"tab" + (tab === "loads" ? " active" : "")} onClick={() => setTab("loads")}>Load History</button>
        <button className={"tab" + (tab === "documents" ? " active" : "")} onClick={() => setTab("documents")}>Documents</button>
      </div>

      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
              <div className="section-title" style={{ marginBottom: 0 }}>Contacts</div>
              <Button size="sm" variant="ghost" icon="plus" style={{ marginLeft: "auto" }} onClick={() => setContactForm({ open: true })}>Add</Button>
            </div>
            {customer.contacts.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No additional contacts yet — {customer.contactName} is the contact on file above.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {customer.contacts.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, borderBottom: "1px solid var(--line-soft)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        {c.name}
                        {c.isPrimary && <Pill tone="success">Primary</Pill>}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        {[c.title, c.phone, c.email].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>
                    <IconButton icon="edit" title="Edit contact" onClick={() => setContactForm({ open: true, contact: c })} />
                    <IconButton icon="trash" title="Remove contact" onClick={() => deleteContact(c.id)} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="section-title">Details</div>
            <div style={{ fontSize: 13, marginBottom: 14 }}>
              <div style={{ color: "var(--muted)", fontSize: 11.5 }}>Payment terms</div>
              {customer.paymentTerms || "—"}
            </div>
            <div className="section-title">Notes</div>
            <textarea
              className="input"
              rows={6}
              placeholder="Internal notes about this customer…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: "vertical" }}
            />
            <Button size="sm" variant="primary" onClick={saveNotes} disabled={savingNotes} style={{ marginTop: 8 }}>
              {savingNotes ? "Saving…" : "Save notes"}
            </Button>
          </div>
        </div>
      )}

      {tab === "loads" && (
        <DataTable<Load>
          tableId={"customer-loads-" + customer.id}
          fetchPage={fetchLoads}
          reloadKey={loadsReload}
          rowKey={(l) => l.id}
          onRowClick={(l) => setDetailLoad(l)}
          searchPlaceholder="Search this customer's loads…"
          emptyIcon="list"
          emptyTitle="No loads yet"
          initialSort={{ by: "pickupTime", dir: "desc" }}
          columns={[
            { key: "loadNumber", label: "Load", sortable: true, render: (l) => <span className="mono" style={{ fontWeight: 600 }}>{l.loadNumber}</span> },
            { key: "route", label: "Route", render: (l) => `${l.origin} → ${l.destination}` },
            { key: "pickupTime", label: "Pickup", sortable: true, render: (l) => fmtDate(l.pickupTime) },
            { key: "status", label: "Status", sortable: true, render: (l) => <StatusPill status={l.status} label={statusLabel(l.status)} /> },
            { key: "rate", label: "Rate", sortable: true, align: "right", render: (l) => <span className="mono">{fmtMoney(l.rate)}</span> },
          ]}
        />
      )}

      {tab === "documents" && (
        <CustomerDocumentsPanel customerId={customer.id} documents={customer.documents} canDelete={canDelete} onChanged={refreshCustomer} />
      )}

      {editOpen && (
        <CustomerFormModal
          customer={customer}
          onClose={() => setEditOpen(false)}
          onSaved={(c) => { setCustomer((prev) => ({ ...prev, ...c })); setEditOpen(false); toast.success("Customer updated."); }}
        />
      )}

      {contactForm.open && (
        <CustomerContactFormModal
          customerId={customer.id}
          contact={contactForm.contact}
          onClose={() => setContactForm({ open: false })}
          onSaved={() => { refreshCustomer(); setContactForm({ open: false }); toast.success("Contact saved."); }}
        />
      )}

      {confirm && (
        <ConfirmDialog title={confirm.title} message={confirm.message} onCancel={() => setConfirm(null)} onConfirm={() => { confirm.onConfirm(); setConfirm(null); }} />
      )}

      {detailLoad && (
        <LoadDetailDrawer
          load={detailLoad}
          user={user}
          onClose={() => setDetailLoad(null)}
          onUpdated={(l) => { setDetailLoad(l); setLoadsReload((k) => k + 1); }}
          onDeleted={() => { setDetailLoad(null); setLoadsReload((k) => k + 1); }}
          onAssign={() => router.push("/board")}
          onEdit={() => router.push("/loads")}
        />
      )}
    </div>
  );
}
