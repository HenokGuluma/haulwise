"use client";

export class ApiRequestError extends Error {
  status: number;
  conflicts?: unknown[];
  constructor(message: string, status: number, conflicts?: unknown[]) {
    super(message);
    this.status = status;
    this.conflicts = conflicts;
  }
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiRequestError(data.error || "Something went wrong.", res.status, data.conflicts);
  }
  return data as T;
}

export const api = {
  get: <T,>(url: string) => apiFetch<T>(url),
  post: <T,>(url: string, body?: unknown) =>
    apiFetch<T>(url, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T,>(url: string, body?: unknown) =>
    apiFetch<T>(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T,>(url: string) => apiFetch<T>(url, { method: "DELETE" }),
};

/** Query-param contract shared with src/lib/pagination.ts on the server side. */
export type TablePageParams = {
  page: number;
  pageSize: number;
  sortBy: string | null;
  sortDir: string;
  search: string;
  filters: Record<string, string[]>;
};

/** XHR-based upload (fetch has no upload-progress event) with a progress callback. */
export function uploadFile<T>(url: string, formData: FormData, onProgress?: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* empty/non-JSON body */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiRequestError((data.error as string) || "Upload failed.", xhr.status));
    };
    xhr.onerror = () => reject(new ApiRequestError("Network error during upload.", 0));
    xhr.send(formData);
  });
}

/**
 * extraParams carries fixed, non-column query params that don't fit the
 * generic filter_<col> contract (e.g. a date-range deep link from the
 * dashboard) — merged in as-is alongside the normal paging/sort/filter set.
 */
export async function fetchTablePage<T>(
  url: string,
  params: TablePageParams,
  extraParams?: Record<string, string>
): Promise<{ rows: T[]; total: number }> {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page));
  qs.set("pageSize", String(params.pageSize));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  qs.set("sortDir", params.sortDir);
  if (params.search) qs.set("search", params.search);
  for (const [key, values] of Object.entries(params.filters)) {
    if (values.length > 0) qs.set("filter_" + key, values.join(","));
  }
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) qs.set(key, value);
    }
  }
  return apiFetch<{ rows: T[]; total: number }>(url + "?" + qs.toString());
}
