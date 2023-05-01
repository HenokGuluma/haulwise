import "server-only";

export type ParsedListParams = {
  page: number;
  pageSize: number;
  sortBy: string | null;
  sortDir: "asc" | "desc";
  search: string;
  filters: Record<string, string[]>;
};

const RESERVED = new Set(["page", "pageSize", "sortBy", "sortDir", "search"]);

/**
 * Shared query-param contract for DataTable-backed list endpoints:
 * page, pageSize, sortBy, sortDir, search, plus filter_<column>=v1,v2 for
 * any column-level multi-select filters.
 */
export function parseListParams(searchParams: URLSearchParams, opts?: { maxPageSize?: number }): ParsedListParams {
  const maxPageSize = opts?.maxPageSize ?? 500;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, parseInt(searchParams.get("pageSize") ?? "25", 10) || 25));
  const sortBy = searchParams.get("sortBy") || null;
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";
  const search = (searchParams.get("search") || "").trim();

  const filters: Record<string, string[]> = {};
  for (const [key, value] of searchParams.entries()) {
    if (RESERVED.has(key) || !key.startsWith("filter_")) continue;
    const col = key.slice("filter_".length);
    filters[col] = value.split(",").filter(Boolean);
  }

  return { page, pageSize, sortBy, sortDir, search, filters };
}
