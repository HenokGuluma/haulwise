"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { EquipmentType } from "@/types";

/**
 * Equipment types are admin-managed and few in number — fetched fresh per
 * mount, no pagination needed. Pass a changing `reloadKey` to refetch after
 * the management tab adds/edits/deletes a type.
 */
export function useEquipmentTypes(reloadKey?: number): EquipmentType[] {
  const [types, setTypes] = useState<EquipmentType[]>([]);
  useEffect(() => {
    api.get<{ rows: EquipmentType[] }>("/api/equipment-types").then((res) => setTypes(res.rows)).catch(() => {});
  }, [reloadKey]);
  return types;
}
