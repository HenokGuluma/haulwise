"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { AnalyticsData } from "@/types";
import type { DateRange } from "@/components/DateRangeFilter";

const EMPTY: AnalyticsData = { monthly: [], statusBreakdown: [], topCustomers: [], equipmentVolume: [] };

export function useAnalytics(range?: DateRange): { data: AnalyticsData; loading: boolean } {
  const [data, setData] = useState<AnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (range?.from) params.set("from", range.from);
    if (range?.to) params.set("to", range.to);
    const qs = params.toString();
    // Previous data is left in place while this resolves (setData is only
    // called on success) — the caller dims the charts via `loading` instead
    // of flashing back to empty on every range change.
    api
      .get<AnalyticsData>(`/api/dashboard/analytics${qs ? "?" + qs : ""}`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range?.from, range?.to]);

  return { data, loading };
}
