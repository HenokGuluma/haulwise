"use client";

// Most lists in this app own their rows as client-fetched state (DataTable's
// fetchPage/reloadKey pattern) and stay correct because every modal that
// mutates them lives inside that same page and bumps its own reloadKey.
// Next.js's router.refresh() doesn't reach that client-owned state at all —
// it only re-runs server components and refreshes their props, which is why
// pages that fetch their list server-side (board/dashboard) stay in sync
// through it while DataTable-based ones don't.
//
// The one place this bites: the topbar's global "New Load" button lives
// outside every page's own tree, so there's no reloadKey it can reach.
// This is a minimal pub/sub for exactly that gap — a mutation performed
// anywhere can notify an entity, and any list for that entity (wherever it
// lives) can subscribe to refetch, without needing a prop channel between
// them. Reusable for any future case in this shape, not just loads.
type Entity = "loads" | "customers" | "drivers" | "equipment" | "documents" | "users" | "roles";
const listeners = new Map<Entity, Set<() => void>>();

export function onDataChange(entity: Entity, cb: () => void): () => void {
  if (!listeners.has(entity)) listeners.set(entity, new Set());
  listeners.get(entity)!.add(cb);
  return () => listeners.get(entity)?.delete(cb);
}

export function notifyDataChange(entity: Entity): void {
  listeners.get(entity)?.forEach((cb) => cb());
}
