// Shared period boundaries for the internal dashboard's Delivered/Revenue
// cards — one definition used both by the initial server-side render
// (dashboard/page.tsx, always "week") and the /api/dashboard/kpis route
// (any period, fetched client-side when the selector changes), so the
// two can never disagree about what "this month" means.
export const DASHBOARD_PERIODS = ["week", "month", "year"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const DASHBOARD_PERIOD_LABELS: Record<DashboardPeriod, string> = {
  week: "This Week",
  month: "This Month",
  year: "This Year",
};

/** "week" is a rolling trailing 7 days (the original, unchanged
 * behavior); "month"/"year" are calendar-aligned from the 1st to now —
 * same convention the dashboard's chart date-range filter already uses
 * for its "This year" preset. */
export function dashboardPeriodRange(period: DashboardPeriod, now: Date = new Date()): { from: Date; to: Date } {
  if (period === "week") {
    return { from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), to: now };
  }
  if (period === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  }
  return { from: new Date(now.getFullYear(), 0, 1), to: now };
}
