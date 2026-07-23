"use client";

import { useState } from "react";
import { Field, ModalBox, PanelHead, Button } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";
import type { Load } from "@/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentLogModal({
  load,
  remaining,
  onClose,
  onSaved,
}: {
  load: Load;
  remaining: number;
  onClose: () => void;
  onSaved: (load: Load) => void;
}) {
  const [amount, setAmount] = useState(String(remaining));
  const [paidAt, setPaidAt] = useState(today());
  const [method, setMethod] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) { setError("Enter an amount greater than 0."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ load: Load }>(`/api/loads/${load.id}/payments`, {
        amount: Number(amount),
        paidAt: new Date(paidAt).toISOString(),
        method: method.trim() || undefined,
        note: note.trim() || undefined,
      });
      onSaved(res.load);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Couldn't log payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalBox onClose={onClose} width={400}>
      <PanelHead title={"Log Payment — " + load.loadNumber} sub={`${remaining > 0 ? "$" + remaining.toLocaleString() + " remaining" : "Fully paid"}`} onClose={onClose} />
      <div className="panel-body">
        {error && <div className="banner banner-danger" style={{ marginBottom: 14 }}>{error}</div>}
        <div className="field-row">
          <Field label="Amount (USD)"><input type="number" min="0" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Date paid"><input type="date" className="input" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></Field>
        </div>
        <Field label="Method" hint="e.g. ACH, Check, Wire"><input className="input" value={method} onChange={(e) => setMethod(e.target.value)} /></Field>
        <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={submitting}>{submitting ? "Logging…" : "Log payment"}</Button>
      </div>
    </ModalBox>
  );
}
