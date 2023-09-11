"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type { AnalyticsData } from "@/types";

const EMPTY: AnalyticsData = { monthly: [], statusBreakdown: [], topCustomers: [], equipmentVolume: [] };

export function useAnalytics(): { data: AnalyticsData; loading: boolean } {
  const [data, setData] = useState<AnalyticsData>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<AnalyticsData>("/api/dashboard/analytics")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}
