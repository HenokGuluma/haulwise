"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui";
import { api } from "@/lib/api-client";

type SearchResults = {
  loads: { id: string; loadNumber: string; origin: string; destination: string; status: string }[];
  drivers: { id: string; firstName: string; lastName: string; status: string }[];
  equipment: { id: string; unitNumber: string; typeCode: string; status: string }[];
  customers: { id: string; companyName: string; status: string }[];
};

type ResultType = "load" | "driver" | "equipment" | "customer";
type FlatResult = { key: string; type: ResultType; icon: string; label: string; sublabel: string; go: () => void };

const EMPTY: SearchResults = { loads: [], drivers: [], equipment: [], customers: [] };
const GROUP_META: Record<ResultType, { label: string; icon: string }> = {
  load: { label: "Loads", icon: "list" },
  driver: { label: "Drivers", icon: "users" },
  equipment: { label: "Equipment", icon: "truck" },
  customer: { label: "Customers", icon: "briefcase" },
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [activeIndex, setActiveIndex] = useState(0);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Anchor the panel to the topbar search trigger so it opens right under it
  // instead of floating centered in the middle of the screen. Falls back to
  // the centered layout on narrow viewports where a right-anchored 600px
  // panel wouldn't fit sensibly under a shrunken trigger.
  useEffect(() => {
    if (!open) return;
    function computeAnchor() {
      const el = document.querySelector<HTMLElement>(".topbar-search-trigger");
      if (el && window.innerWidth > 640) {
        const r = el.getBoundingClientRect();
        setAnchor({ top: r.bottom + 10, right: Math.max(12, window.innerWidth - r.right) });
      } else {
        setAnchor(null);
      }
    }
    computeAnchor();
    window.addEventListener("resize", computeAnchor);
    return () => window.removeEventListener("resize", computeAnchor);
  }, [open]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    function onOpenEvent() { setOpen(true); }
    window.addEventListener("haulwise:open-command-palette", onOpenEvent);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("haulwise:open-command-palette", onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(EMPTY);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults(EMPTY); return; }
    const t = setTimeout(() => {
      api.get<SearchResults>(`/api/search?q=${encodeURIComponent(query.trim())}`).then(setResults).catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  const flat: FlatResult[] = [
    ...results.loads.map((l): FlatResult => ({ key: "l" + l.id, type: "load", icon: "list", label: l.loadNumber, sublabel: `${l.origin} → ${l.destination}`, go: () => go(`/loads?open=${l.id}`) })),
    ...results.drivers.map((d): FlatResult => ({ key: "d" + d.id, type: "driver", icon: "users", label: `${d.firstName} ${d.lastName}`, sublabel: "Driver · " + d.status.replace("_", " "), go: () => go(`/roster?tab=drivers&driverId=${d.id}`) })),
    ...results.equipment.map((e): FlatResult => ({ key: "e" + e.id, type: "equipment", icon: "truck", label: e.unitNumber, sublabel: "Equipment · " + e.typeCode, go: () => go(`/roster?tab=equipment&equipmentId=${e.id}`) })),
    ...results.customers.map((c): FlatResult => ({ key: "c" + c.id, type: "customer", icon: "briefcase", label: c.companyName, sublabel: "Customer", go: () => go(`/customers/${c.id}`) })),
  ];

  const groups: { type: ResultType; items: FlatResult[] }[] = (["load", "driver", "equipment", "customer"] as ResultType[])
    .map((type) => ({ type, items: flat.filter((r) => r.type === type) }))
    .filter((g) => g.items.length > 0);

  useEffect(() => setActiveIndex(0), [query]);

  if (!open) return null;

  return (
    <div className="overlay center cmdk-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div
        className="cmdk"
        style={anchor ? { position: "fixed", top: anchor.top, right: anchor.right, margin: 0 } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cmdk-input-row">
          <span className="cmdk-input-icon"><Icon name="search" size={16} /></span>
          <input
            ref={inputRef}
            className="cmdk-input"
            placeholder="Search loads, drivers, equipment, customers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flat.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); flat[activeIndex]?.go(); }
            }}
          />
          <kbd className="cmdk-esc">Esc</kbd>
        </div>
        <div className="cmdk-results">
          {query.trim() && flat.length === 0 && (
            <div className="cmdk-empty">
              <Icon name="search" size={22} />
              <div>No results for &quot;{query}&quot;.</div>
            </div>
          )}
          {!query.trim() && (
            <div className="cmdk-empty">
              <Icon name="sparkles" size={22} />
              <div>Search across loads, drivers, equipment, and customers.</div>
            </div>
          )}
          {groups.map((group) => {
            const meta = GROUP_META[group.type];
            return (
              <div key={group.type} className="cmdk-group">
                <div className="cmdk-group-label">{meta.label}</div>
                {group.items.map((r) => {
                  const i = flat.indexOf(r);
                  return (
                    <button key={r.key} type="button" className={"cmdk-item" + (i === activeIndex ? " active" : "")} onMouseEnter={() => setActiveIndex(i)} onClick={r.go}>
                      <span className={"cmdk-item-icon cmdk-item-icon-" + r.type}><Icon name={r.icon} size={14} /></span>
                      <span className="cmdk-item-label">{r.label}</span>
                      <span className="cmdk-item-sub">{r.sublabel}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
