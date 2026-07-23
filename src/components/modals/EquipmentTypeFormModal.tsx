"use client";

import { useState } from "react";
import { Field, ModalBox, PanelHead, Button, Icon } from "@/components/ui";
import { api, ApiRequestError } from "@/lib/api-client";
import { EQUIPMENT_TYPE_ICONS, EQUIPMENT_TYPE_TONES, equipmentToneColors } from "@/lib/equipment-types";
import type { EquipmentType } from "@/types";

export function EquipmentTypeFormModal({
  type,
  onClose,
  onSaved,
}: {
  type?: EquipmentType;
  onClose: () => void;
  onSaved: (type: EquipmentType) => void;
}) {
  const isEdit = !!type;
  const [form, setForm] = useState({
    code: type?.code ?? "",
    label: type?.label ?? "",
    icon: type?.icon ?? EQUIPMENT_TYPE_ICONS[0],
    tone: type?.tone ?? EQUIPMENT_TYPE_TONES[0],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = "Required.";
    else if (!/^[A-Za-z0-9_-]+$/.test(form.code.trim())) e.code = "Letters, numbers, - and _ only.";
    if (!form.label.trim()) e.label = "Required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);
    const payload = { code: form.code.trim(), label: form.label.trim(), icon: form.icon, tone: form.tone };
    try {
      if (isEdit && type) {
        const res = await api.patch<{ type: EquipmentType }>(`/api/equipment-types/${type.id}`, payload);
        onSaved(res.type);
      } else {
        const res = await api.post<{ type: EquipmentType }>("/api/equipment-types", payload);
        onSaved(res.type);
      }
    } catch (err) {
      setServerError(err instanceof ApiRequestError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const preview = equipmentToneColors(form.tone);

  return (
    <ModalBox onClose={onClose} width={440}>
      <PanelHead title={isEdit ? "Edit Equipment Type" : "Add Equipment Type"} onClose={onClose} />
      <div className="panel-body">
        {serverError && <div className="banner banner-danger" style={{ marginBottom: 14 }}>{serverError}</div>}

        <div className="field-row" style={{ alignItems: "flex-end" }}>
          <Field label="Code" error={errors.code} hint={isEdit ? "Renaming updates every unit and load that uses it." : "Short, e.g. V or REEFER"}>
            <input className={"input" + (errors.code ? " err" : "")} placeholder="e.g. V" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={10} />
          </Field>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 60, height: 46, borderRadius: 12, background: preview.bg, color: preview.fg, flexShrink: 0 }}>
            <Icon name={form.icon} size={22} />
          </div>
        </div>

        <Field label="Label" error={errors.label}>
          <input className={"input" + (errors.label ? " err" : "")} placeholder="e.g. Dry Van" value={form.label} onChange={(e) => set("label", e.target.value)} maxLength={60} />
        </Field>

        <Field label="Icon">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EQUIPMENT_TYPE_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => set("icon", icon)}
                title={icon}
                aria-label={icon}
                className="icon-btn"
                style={{
                  width: 34, height: 34,
                  border: form.icon === icon ? "2px solid var(--accent)" : "1px solid var(--line)",
                  background: form.icon === icon ? "var(--accent-bg)" : "transparent",
                }}
              >
                <Icon name={icon} size={16} />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Color">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EQUIPMENT_TYPE_TONES.map((tone) => {
              const c = equipmentToneColors(tone);
              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() => set("tone", tone)}
                  title={tone}
                  aria-label={tone}
                  className="icon-btn"
                  style={{
                    width: 28, height: 28, borderRadius: 999, background: c.bg,
                    border: form.tone === tone ? "2px solid " + c.fg : "1px solid var(--line)",
                  }}
                />
              );
            })}
          </div>
        </Field>
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="primary" onClick={handleSubmit} loading={submitting}>
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Add type"}
        </Button>
      </div>
    </ModalBox>
  );
}
