"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { Driver } from "@/types";

/**
 * Full driver list for dropdowns that need every driver (e.g. linking drivers
 * to a piece of equipment from the equipment side). Returns the list plus a
 * `reload` so callers can refresh after mutating a driver's equipment link.
 */
export function useDrivers(enabled: boolean = true): { drivers: Driver[]; reload: () => void } {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!enabled) return;
    api
      .get<{ rows: Driver[] }>("/api/drivers?pageSize=500&sortBy=name&sortDir=asc")
      .then((res) => setDrivers(res.rows))
      .catch(() => {});
  }, [enabled, tick]);
  return { drivers, reload };
}
