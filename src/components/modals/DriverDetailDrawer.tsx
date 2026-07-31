"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Drawer, PanelHead, Button, Icon, IconButton, StatusPill, useToast } from "@/components/ui";
import { DataTable, type FetchPageParams } from "@/components/DataTable";
import { fmtMoney, fmtDate, fmtBytes, fmtRelative, daysUntil, statusLabel } from "@/lib/format";
import { api, fetchTablePage, uploadFile, ApiRequestError } from "@/lib/api-client";
import type { Driver, DriverDocument, DriverDocumentType, Load } from "@/types";

const DOC_TYPES: DriverDocumentType[] = ["DRIVERS_LICENSE", "MEDICAL_CERT", "MVR"];
const DOC_LABELS: Record<DriverDocumentType, string> = { DRIVERS_LICENSE: "Driver's License Scan", MEDICAL_CERT: "Medical Certificate", MVR: "MVR" };
const ACCEPTED_EXT = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

function DriverDocSlot({ driverId, type, docs, canDelete, onChanged }: { driverId: string; type: DriverDocumentType; docs: DriverDocument[]; canDelete: boolean; onChanged: () => void }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const current = docs[0] ?? null;
  const fileUrl = (id: string) => `/api/drivers/${driverId}/documents/${id}`;

  async function doUpload(file: File) {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);
    setUploading(true);
    try {
      await uploadFile(`/api/drivers/${driverId}/documents`, formData);
      toast.success(DOC_LABELS[type] + " uploaded.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(id: string) {
    try {
      await api.del(`/api/drivers/${driverId}/documents/${id}`);
      toast.info("Document removed.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "You don't have permission to remove documents.");
    }
  }

  return (
    <div className={"doc-slot" + (dragOver ? " drag-over" : "")}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) doUpload(f); }}>
      <input ref={inputRef} type="file" accept={ACCEPTED_EXT} style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) doUpload(f); }} />
      <div className="doc-slot-head">
        <span className="doc-slot-label">{DOC_LABELS[type]}</span>
        {current && !uploading && <button type="button" className="btn btn-ghost btn-sm" onClick={() => inputRef.current?.click()}>Replace</button>}
      </div>
      {uploading ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Uploading…</div>
      ) : current ? (
        <div className="doc-slot-file">
          <div className="doc-thumb doc-thumb-pdf"><Icon name="fileText" size={16} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <a href={fileUrl(current.id)} target="_blank" rel="noreferrer" className="doc-slot-filename">{current.fileName}</a>
            <div className="doc-slot-meta">{fmtBytes(current.fileSizeBytes)} · {fmtRelative(current.uploadedAt)}</div>
          </div>
          {canDelete && <IconButton icon="trash" title="Delete" onClick={() => removeDoc(current.id)} />}
        </div>
      ) : (
        <div className="doc-slot-empty" onClick={() => inputRef.current?.click()}>
          <Icon name="upload" size={15} />
          <span>Drop file or click to upload</span>
        </div>
      )}
    </div>
  );
}

export function DriverDetailDrawer({ driver, canDelete, onClose, onUpdated }: { driver: Driver; canDelete: boolean; onClose: () => void; onUpdated: (d: Driver) => void }) {
  const toast = useToast();
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [endorsementInput, setEndorsementInput] = useState("");
  const [savingEndorsements, setSavingEndorsements] = useState(false);

  async function refreshDocs() {
    const res = await api.get<{ documents: DriverDocument[] }>(`/api/drivers/${driver.id}/documents`);
    setDocuments(res.documents);
  }

  useEffect(() => { refreshDocs(); }, [driver.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addEndorsement() {
    const val = endorsementInput.trim();
    if (!val || driver.endorsements.includes(val)) { setEndorsementInput(""); return; }
    setSavingEndorsements(true);
    try {
      const res = await api.patch<{ driver: Driver }>(`/api/drivers/${driver.id}`, { endorsements: [...driver.endorsements, val] });
      onUpdated(res.driver);
      setEndorsementInput("");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't add endorsement.");
    } finally {
      setSavingEndorsements(false);
    }
  }

  async function removeEndorsement(tag: string) {
    try {
      const res = await api.patch<{ driver: Driver }>(`/api/drivers/${driver.id}`, { endorsements: driver.endorsements.filter((e) => e !== tag) });
      onUpdated(res.driver);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't remove endorsement.");
    }
  }

  const fetchLoads = useCallback(
    (params: FetchPageParams) => fetchTablePage<Load>("/api/loads", { ...params, filters: { ...params.filters, driverId: [driver.id] } }),
    [driver.id]
  );

  const medDays = driver.medicalCertExpiration ? daysUntil(driver.medicalCertExpiration) : null;

  return (
    <Drawer onClose={onClose} width={480}>
      <PanelHead title={driver.firstName + " " + driver.lastName} sub={driver.phone} onClose={onClose} />
      <div className="panel-body">
        <div className="section-title">License & Medical</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 16 }}>
          <div><div style={{ color: "var(--muted)", fontSize: 11.5 }}>License #</div><span className="mono">{driver.licenseNo}</span></div>
          <div><div style={{ color: "var(--muted)", fontSize: 11.5 }}>License expires</div>{fmtDate(driver.licenseExpiration)}</div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: 11.5 }}>Medical cert expires</div>
            {driver.medicalCertExpiration ? (
              <span style={{ color: medDays !== null && medDays < 30 ? "var(--danger)" : undefined }}>{fmtDate(driver.medicalCertExpiration)}</span>
            ) : "—"}
          </div>
        </div>

        <div className="section-title">Endorsements</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {driver.endorsements.length === 0 && <span style={{ fontSize: 12, color: "var(--muted)" }}>None on file.</span>}
          {driver.endorsements.map((tag) => (
            <span key={tag} className="pill pill-muted">
              {tag}
              <button onClick={() => removeEndorsement(tag)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, marginLeft: 3, display: "flex" }}><Icon name="x" size={10} /></button>
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input className="input" placeholder="e.g. Hazmat, Tanker, Doubles/Triples" value={endorsementInput} onChange={(e) => setEndorsementInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addEndorsement()} />
          <Button size="sm" variant="ghost" onClick={addEndorsement} disabled={savingEndorsements}>Add</Button>
        </div>

        <div className="section-title">Documents</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {DOC_TYPES.map((type) => (
            <DriverDocSlot key={type} driverId={driver.id} type={type} docs={documents.filter((d) => d.type === type)} canDelete={canDelete} onChanged={refreshDocs} />
          ))}
        </div>

        <div className="section-title">Assignment History</div>
        <DataTable<Load>
          tableId={"driver-loads-" + driver.id}
          fetchPage={fetchLoads}
          rowKey={(l) => l.id}
          searchPlaceholder="Search this driver's loads…"
          emptyTitle="No loads yet"
          initialSort={{ by: "pickupTime", dir: "desc" }}
          pageSizeOptions={[10, 25, 50]}
          columns={[
            { key: "loadNumber", label: "Load", render: (l) => <span className="mono" style={{ fontWeight: 600 }}>{l.loadNumber}</span> },
            { key: "route", label: "Route", render: (l) => `${l.origin} → ${l.destination}` },
            { key: "pickupTime", label: "Pickup", render: (l) => fmtDate(l.pickupTime) },
            { key: "status", label: "Status", render: (l) => <StatusPill status={l.status} label={statusLabel(l.status)} /> },
            { key: "rate", label: "Rate", align: "right", render: (l) => <span className="mono">{fmtMoney(l.rate)}</span> },
          ]}
        />
      </div>
      <div className="panel-foot">
        <Button variant="dark" onClick={onClose}>Done</Button>
      </div>
    </Drawer>
  );
}
