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
