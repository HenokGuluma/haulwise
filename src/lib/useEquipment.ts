"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Equipment } from "@/types";

/**
 * Full equipment list for dropdowns that need every unit (e.g. linking a
 * driver to their default equipment). Fetched on demand — only mounted where
 * needed — rather than every page loading the whole equipment table up front.
 */
export function useEquipment(enabled: boolean = true): Equipment[] {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  useEffect(() => {
    if (!enabled) return;
    api
      .get<{ rows: Equipment[] }>("/api/equipment?pageSize=500&sortBy=unitNumber&sortDir=asc")
      .then((res) => setEquipment(res.rows))
      .catch(() => {});
  }, [enabled]);
  return equipment;
}
