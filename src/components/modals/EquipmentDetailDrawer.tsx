"use client";

import { useCallback, useEffect, useState } from "react";
import { Drawer, PanelHead, Button, Field, StatusPill, useToast } from "@/components/ui";
import { DataTable, type FetchPageParams } from "@/components/DataTable";
import { fmtMoney, fmtDate, daysUntil, statusLabel } from "@/lib/format";
import { api, fetchTablePage, ApiRequestError } from "@/lib/api-client";
import type { Equipment, EquipmentMaintenanceRecord, Load } from "@/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EquipmentDetailDrawer({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const toast = useToast();
  const [records, setRecords] = useState<EquipmentMaintenanceRecord[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: today(), description: "", cost: "", performedBy: "" });
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    const res = await api.get<{ records: EquipmentMaintenanceRecord[] }>(`/api/equipment/${equipment.id}/maintenance`);
    setRecords(res.records);
  }
  useEffect(() => { refresh(); }, [equipment.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addRecord() {
    if (!form.description.trim()) { toast.error("Enter a description."); return; }
    setSubmitting(true);
    try {
      await api.post(`/api/equipment/${equipment.id}/maintenance`, {
        date: new Date(form.date).toISOString(),
        description: form.description.trim(),
        cost: form.cost ? Number(form.cost) : undefined,
        performedBy: form.performedBy.trim() || undefined,
      });
      toast.success("Maintenance record added.");
      setForm({ date: today(), description: "", cost: "", performedBy: "" });
      setAdding(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't add record.");
    } finally {
      setSubmitting(false);
    }
  }

  const fetchLoads = useCallback(
    (params: FetchPageParams) => fetchTablePage<Load>("/api/loads", { ...params, filters: { ...params.filters, equipmentId: [equipment.id] } }),
    [equipment.id]
  );

  const regDays = equipment.registrationExpiration ? daysUntil(equipment.registrationExpiration) : null;

  return (
    <Drawer onClose={onClose} width={480}>
      <PanelHead title={equipment.unitNumber} sub={`${equipment.typeCode} · Next service ${fmtDate(equipment.nextMaintenance)}`} onClose={onClose} />
      <div className="panel-body">
        <div className="section-title">Registration</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, marginBottom: 16 }}>
          <div><div style={{ color: "var(--muted)", fontSize: 11.5 }}>License plate</div>{equipment.licensePlate ? <span className="mono">{equipment.licensePlate}</span> : "—"}</div>
          <div>
            <div style={{ color: "var(--muted)", fontSize: 11.5 }}>Registration expires</div>
            {equipment.registrationExpiration ? (
              <span style={{ color: regDays !== null && regDays < 30 ? "var(--danger)" : undefined }}>{fmtDate(equipment.registrationExpiration)}</span>
            ) : "—"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div className="section-title" style={{ marginBottom: 0 }}>Maintenance History</div>
          {!adding && <button type="button" className="doc-slot-history-toggle" style={{ marginLeft: "auto" }} onClick={() => setAdding(true)}>+ Add record</button>}
        </div>

        {adding && (
          <div className="card" style={{ padding: 12, marginBottom: 14 }}>
            <div className="field-row">
              <Field label="Date"><input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
              <Field label="Cost (ETB)"><input type="number" min="0" className="input" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} /></Field>
            </div>
            <Field label="Description"><input className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Brake pad replacement" /></Field>
            <Field label="Performed by"><input className="input" value={form.performedBy} onChange={(e) => setForm((f) => ({ ...f, performedBy: e.target.value }))} /></Field>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              <Button size="sm" variant="primary" onClick={addRecord} disabled={submitting}>{submitting ? "Saving…" : "Save record"}</Button>
            </div>
          </div>
        )}

        {records.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>No maintenance recorded yet — only the next-due date above.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {records.map((r) => (
              <div key={r.id} className="card" style={{ padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600 }}>
                  <span>{r.description}</span>
                  {r.cost !== null && <span className="mono">{fmtMoney(r.cost)}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                  {fmtDate(r.date)}{r.performedBy ? " · " + r.performedBy : ""}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="section-title">Assignment History</div>
        <DataTable<Load>
          tableId={"equipment-loads-" + equipment.id}
          fetchPage={fetchLoads}
          rowKey={(l) => l.id}
          searchPlaceholder="Search this unit's loads…"
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
