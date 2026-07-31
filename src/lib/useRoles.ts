"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { RoleRow } from "@/types";

/**
 * Roles are admin-managed and few in number — fetched fresh per mount, no
 * pagination needed. Pass a changing `reloadKey` to refetch after the Roles
 * screen adds/edits/deletes a role. Requires roles:manage on the caller
 * (the only route this hook talks to is /api/roles).
 */
export function useRoles(reloadKey?: number): RoleRow[] {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  useEffect(() => {
    api.get<{ rows: RoleRow[] }>("/api/roles").then((res) => setRoles(res.rows)).catch(() => {});
  }, [reloadKey]);
  return roles;
}
