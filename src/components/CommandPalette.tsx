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

type FlatResult = { key: string; icon: string; label: string; sublabel: string; go: () => void };

const EMPTY: SearchResults = { loads: [], drivers: [], equipment: [], customers: [] };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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
    ...results.loads.map((l) => ({ key: "l" + l.id, icon: "list", label: l.loadNumber, sublabel: `${l.origin} → ${l.destination}`, go: () => go(`/loads?open=${l.id}`) })),
    ...results.drivers.map((d) => ({ key: "d" + d.id, icon: "users", label: `${d.firstName} ${d.lastName}`, sublabel: "Driver · " + d.status.replace("_", " "), go: () => go(`/roster?tab=drivers&driverId=${d.id}`) })),
    ...results.equipment.map((e) => ({ key: "e" + e.id, icon: "truck", label: e.unitNumber, sublabel: "Equipment · " + e.typeCode, go: () => go(`/roster?tab=equipment&equipmentId=${e.id}`) })),
    ...results.customers.map((c) => ({ key: "c" + c.id, icon: "briefcase", label: c.companyName, sublabel: "Customer", go: () => go(`/customers/${c.id}`) })),
  ];

  useEffect(() => setActiveIndex(0), [query]);

  if (!open) return null;

  return (
    <div className="overlay center" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmdk-input-row">
          <Icon name="search" size={15} />
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
          {query.trim() && flat.length === 0 && <div className="cmdk-empty">No results for &quot;{query}&quot;.</div>}
          {!query.trim() && <div className="cmdk-empty">Type to search across the whole app…</div>}
          {flat.map((r, i) => (
            <button key={r.key} type="button" className={"cmdk-item" + (i === activeIndex ? " active" : "")} onMouseEnter={() => setActiveIndex(i)} onClick={r.go}>
              <Icon name={r.icon} size={15} />
              <span className="cmdk-item-label">{r.label}</span>
              <span className="cmdk-item-sub">{r.sublabel}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
