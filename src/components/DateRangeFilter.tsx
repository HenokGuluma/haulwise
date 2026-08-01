"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui";

/** ISO yyyy-mm-dd bounds, inclusive. `null` on either side means unbounded. */
export type DateRange = { from: string | null; to: string | null };

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
}
function fmtShort(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const TODAY = () => isoDate(new Date());
const PRESETS: { key: string; label: string; range: () => DateRange }[] = [
  { key: "7d", label: "Last 7 days", range: () => ({ from: daysAgo(6), to: TODAY() }) },
  { key: "30d", label: "Last 30 days", range: () => ({ from: daysAgo(29), to: TODAY() }) },
  { key: "90d", label: "Last 90 days", range: () => ({ from: daysAgo(89), to: TODAY() }) },
  { key: "ytd", label: "This year", range: () => ({ from: `${new Date().getFullYear()}-01-01`, to: TODAY() }) },
  { key: "all", label: "All time", range: () => ({ from: null, to: null }) },
];

function matchPreset(value: DateRange): string | null {
  for (const p of PRESETS) {
    const r = p.range();
    if (r.from === value.from && r.to === value.to) return p.key;
  }
  return null;
}

export function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.from ?? "");
  const [customTo, setCustomTo] = useState(value.to ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    setCustomFrom(value.from ?? "");
    setCustomTo(value.to ?? "");
  }, [value.from, value.to]);

  const activePreset = matchPreset(value);
  const label = activePreset
    ? PRESETS.find((p) => p.key === activePreset)!.label
    : value.from && value.to
    ? `${fmtShort(value.from)} – ${fmtShort(value.to)}`
    : "All time";

  function applyCustom() {
    if (!customFrom || !customTo) return;
    onChange({ from: customFrom, to: customTo });
    setOpen(false);
  }

  return (
    <div className="dt-menu-anchor" ref={ref}>
      <button
        type="button"
        className={"btn btn-ghost btn-sm" + (activePreset && activePreset !== "all" ? " dt-filter-active" : "")}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="calendar" size={13} /> {label} <Icon name="chevronDown" size={12} className="dt-chevron" />
      </button>
      {open && (
        <div className="dt-menu" style={{ minWidth: 230 }}>
          {PRESETS.map((p) => (
            <div key={p.key} className="dt-menu-item" onClick={() => { onChange(p.range()); setOpen(false); }}>
              <span style={{ width: 14, display: "inline-flex", flexShrink: 0, color: "var(--accent)" }}>
                {activePreset === p.key && <Icon name="checkCircle" size={13} />}
              </span>
              {p.label}
            </div>
          ))}
          <div style={{ borderTop: "1px solid var(--line-soft)", marginTop: 6, paddingTop: 8 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, padding: "0 8px 6px" }}>Custom range</div>
            <div style={{ display: "flex", gap: 6, padding: "0 8px" }}>
              <input type="date" className="input" style={{ fontSize: 12, padding: "6px 8px" }} value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} />
              <input type="date" className="input" style={{ fontSize: 12, padding: "6px 8px" }} value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
            <div style={{ padding: "8px 8px 2px" }}>
              <button type="button" className="btn btn-dark btn-sm" style={{ width: "100%" }} disabled={!customFrom || !customTo} onClick={applyCustom}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
