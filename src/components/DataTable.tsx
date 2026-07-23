"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, EmptyState } from "@/components/ui";
import { toCSV } from "@/lib/format";

export type SortDir = "asc" | "desc";

export type DataTableColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
  width?: string;
  /** Enables a multi-select filter dropdown in the toolbar for this column. */
  filterOptions?: { value: string; label: string }[];
  /** Hidden by default; user can still turn it on via the column-visibility menu. */
  defaultHidden?: boolean;
  render?: (row: T) => React.ReactNode;
  /** Value used for CSV export; falls back to the raw (row as any)[key] if omitted. */
  exportValue?: (row: T) => string | number;
};

export type FetchPageParams = {
  page: number;
  pageSize: number;
  sortBy: string | null;
  sortDir: SortDir;
  search: string;
  filters: Record<string, string[]>;
};

export type FetchPageResult<T> = { rows: T[]; total: number };

type Density = "comfortable" | "compact";

type TablePrefs = {
  pageSize?: number;
  density?: Density;
  hiddenColumns?: string[];
};

function loadPrefs(tableId: string): TablePrefs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("haulwise-table-" + tableId);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(tableId: string, prefs: TablePrefs) {
  try {
    localStorage.setItem("haulwise-table-" + tableId, JSON.stringify(prefs));
  } catch {
    // best-effort — ignore quota/availability errors
  }
}

export function DataTable<T>({
  tableId,
  columns,
  fetchPage,
  rowKey,
  onRowClick,
  emptyTitle = "No results",
  emptyHint,
  emptyIcon = "list",
  searchPlaceholder = "Search…",
  pageSizeOptions = [25, 50, 100],
  initialSort,
  toolbarExtra,
  csvFilename = "export.csv",
  reloadKey,
  onTotalChange,
}: {
  tableId: string;
  columns: DataTableColumn<T>[];
  fetchPage: (params: FetchPageParams) => Promise<FetchPageResult<T>>;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyHint?: string;
  emptyIcon?: string;
  searchPlaceholder?: string;
  pageSizeOptions?: number[];
  initialSort?: { by: string; dir: SortDir };
  toolbarExtra?: React.ReactNode;
  csvFilename?: string;
  reloadKey?: number | string;
  onTotalChange?: (total: number) => void;
}) {
  const prefs = useMemo(() => loadPrefs(tableId), [tableId]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(prefs.pageSize ?? pageSizeOptions[0]);
  const [sortBy, setSortBy] = useState<string | null>(initialSort?.by ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(initialSort?.dir ?? "asc");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [density, setDensity] = useState<Density>(prefs.density ?? "comfortable");
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(
    new Set(prefs.hiddenColumns ?? columns.filter((c) => c.defaultHidden).map((c) => c.key))
  );
  const [openMenu, setOpenMenu] = useState<"filter" | "columns" | null>(null);
  const [filterMenuKey, setFilterMenuKey] = useState<string | null>(null);

  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const requestId = useRef(0);
  // Kept in a ref (not a load() dependency) so callers don't need to memoize
  // this callback themselves — an inline arrow function is fine.
  const onTotalChangeRef = useRef(onTotalChange);
  onTotalChangeRef.current = onTotalChange;

  // Debounce free-text search.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any param change resets to page 1.
  useEffect(() => {
    setPage(1);
  }, [pageSize, sortBy, sortDir, search, filters, reloadKey]);

  const load = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    fetchPage({ page, pageSize, sortBy, sortDir, search, filters })
      .then((res) => {
        if (id !== requestId.current) return;
        setRows(res.rows);
        setTotal(res.total);
        setLoading(false);
        onTotalChangeRef.current?.(res.total);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : "Couldn't load data.");
        setLoading(false);
      });
  }, [fetchPage, page, pageSize, sortBy, sortDir, search, filters]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSort(key: string) {
    if (sortBy !== key) {
      setSortBy(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortBy(null);
      setSortDir("asc");
    }
  }

  function toggleFilterValue(colKey: string, value: string) {
    setFilters((prev) => {
      const current = new Set(prev[colKey] ?? []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      const next = { ...prev };
      if (current.size === 0) delete next[colKey];
      else next[colKey] = Array.from(current);
      return next;
    });
  }

  function updateDensity(d: Density) {
    setDensity(d);
    savePrefs(tableId, { pageSize, density: d, hiddenColumns: Array.from(hiddenColumns) });
  }
  function updatePageSize(n: number) {
    setPageSize(n);
    savePrefs(tableId, { pageSize: n, density, hiddenColumns: Array.from(hiddenColumns) });
  }
  function toggleColumn(key: string) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      savePrefs(tableId, { pageSize, density, hiddenColumns: Array.from(next) });
      return next;
    });
  }

  async function exportCSV() {
    setExporting(true);
    try {
      const res = await fetchPage({ page: 1, pageSize: Math.max(total, 1), sortBy, sortDir, search, filters });
      const visible = columns.filter((c) => !hiddenColumns.has(c.key));
      const csv = toCSV(res.rows, visible.map((c) => ({
        label: c.label,
        get: (row: T) => c.exportValue ? c.exportValue(row) : String((row as Record<string, unknown>)[c.key] ?? ""),
      })));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = csvFilename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const visibleColumns = columns.filter((c) => !hiddenColumns.has(c.key));
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, page * pageSize);

  return (
    <div className="dt-wrap">
      <div className="dt-toolbar">
        <div className="search-box dt-search">
          <Icon name="search" size={14} />
          <input placeholder={searchPlaceholder} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>

        {columns.filter((c) => c.filterOptions).map((col) => {
          const active = filters[col.key]?.length ?? 0;
          return (
            <div key={col.key} className="dt-menu-anchor">
              <button
                type="button"
                className={"btn btn-ghost btn-sm" + (active ? " dt-filter-active" : "")}
                onClick={() => { setOpenMenu(openMenu === "filter" && filterMenuKey === col.key ? null : "filter"); setFilterMenuKey(col.key); }}
              >
                {col.label}{active > 0 ? ` (${active})` : ""}
                <Icon name="chevronDown" size={11} className="dt-chevron" />
              </button>
              {openMenu === "filter" && filterMenuKey === col.key && (
                <div className="dt-menu">
                  {col.filterOptions!.map((opt) => (
                    <label key={opt.value} className="dt-menu-item">
                      <input
                        type="checkbox"
                        checked={filters[col.key]?.includes(opt.value) ?? false}
                        onChange={() => toggleFilterValue(col.key, opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {toolbarExtra}
          <div className="dt-menu-anchor">
            <button type="button" className="icon-btn" title="Row density" aria-label="Toggle row density" onClick={() => updateDensity(density === "comfortable" ? "compact" : "comfortable")}>
              <Icon name="list" size={14} />
            </button>
          </div>
          <div className="dt-menu-anchor">
            <button type="button" className="icon-btn" title="Show/hide columns" aria-label="Show or hide columns" onClick={() => setOpenMenu(openMenu === "columns" ? null : "columns")}>
              <Icon name="columns" size={14} />
            </button>
            {openMenu === "columns" && (
              <div className="dt-menu dt-menu-right">
                {columns.map((c) => (
                  <label key={c.key} className="dt-menu-item">
                    <input type="checkbox" checked={!hiddenColumns.has(c.key)} onChange={() => toggleColumn(c.key)} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportCSV} disabled={exporting}>
            <Icon name="download" size={13} />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      <div className={"card dt-table-card" + (density === "compact" ? " dt-compact" : "")} onClick={() => openMenu && setOpenMenu(null)}>
        <div className="dt-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    style={{ width: c.width, textAlign: c.align === "right" ? "right" : "left", cursor: c.sortable ? "pointer" : undefined }}
                    onClick={c.sortable ? () => toggleSort(c.key) : undefined}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {c.label}
                      {c.sortable && sortBy === c.key && (
                        <Icon name={sortDir === "asc" ? "chevronUp" : "chevronDown"} size={12} />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                  <tr key={"skeleton-" + i}>
                    {visibleColumns.map((c) => (
                      <td key={c.key}><div className="dt-skeleton" /></td>
                    ))}
                  </tr>
                ))}

              {!loading && !error && rows.length > 0 &&
                rows.map((row) => (
                  <tr key={rowKey(row)} onClick={() => onRowClick?.(row)}>
                    {visibleColumns.map((c) => (
                      <td key={c.key} style={{ textAlign: c.align === "right" ? "right" : "left" }}>
                        {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {!loading && !error && rows.length === 0 && (
          <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} />
        )}
        {!loading && error && (
          <div className="empty-state">
            <Icon name="alertTriangle" size={30} />
            <h4>Couldn&apos;t load data</h4>
            <p>{error}</p>
            <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={load}>
              <Icon name="refresh" size={13} /> Retry
            </button>
          </div>
        )}
      </div>

      {!error && total > 0 && (
        <div className="dt-pagination">
          <span className="dt-pagination-summary">{rangeStart}–{rangeEnd} of {total}</span>
          <select className="input dt-pagesize" value={pageSize} onChange={(e) => updatePageSize(Number(e.target.value))}>
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
          <div className="dt-pagination-nav">
            <button type="button" className="icon-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} title="Previous page" aria-label="Previous page">
              <Icon name="chevronLeft" size={14} />
            </button>
            <span className="dt-pagination-page">Page {page} of {totalPages}</span>
            <button type="button" className="icon-btn" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} title="Next page" aria-label="Next page">
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
