"use client";

import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { fmtMoney, fmtMoneyCompact } from "@/lib/format";
import { useChartColors, type ChartColors } from "@/lib/useChartColors";
import type { MonthlyAnalyticsPoint } from "@/types";

function ChartTooltip({
  active,
  payload,
  label,
  hasNet,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
  hasNet: boolean;
}) {
  if (!active || !payload?.length) return null;
  const revenue = payload.find((p) => p.dataKey === "revenue")?.value ?? 0;
  const netRevenue = payload.find((p) => p.dataKey === "netRevenue")?.value ?? 0;
  const loads = payload.find((p) => p.dataKey === "loads")?.value ?? 0;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{label}</div>
      <div className="chart-tooltip-row"><span>{hasNet ? "Gross Volume" : "Revenue"}</span><strong>{fmtMoney(revenue)}</strong></div>
      {hasNet && <div className="chart-tooltip-row"><span>Revenue</span><strong>{fmtMoney(netRevenue)}</strong></div>}
      <div className="chart-tooltip-row"><span>Loads</span><strong>{loads}</strong></div>
    </div>
  );
}

// Two (or three) series on two different scales sharing one plot area, so
// color alone can't carry which mark belongs to which axis. This
// plain-HTML legend (rendered below the SVG, not inside it) is the only
// place that's said — an in-plot axis title (recharts'
// insideTopLeft/insideTopRight) was tried first but collided with the
// topmost tick's number right in that corner. Flow HTML has no such
// collision risk.
function ChartLegend({ c, hasNet }: { c: ChartColors; hasNet: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 10, fontSize: 11.5, color: c["--muted"], flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 14, height: 2, borderRadius: 1, background: c["--accent"], display: "inline-block" }} />
        {hasNet ? "Gross Volume (left axis)" : "Revenue (left axis)"}
      </span>
      {hasNet && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 2, borderRadius: 1, background: c["--success"], display: "inline-block" }} />
          Revenue — net (left axis)
        </span>
      )}
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: c["--accent-bg"], display: "inline-block" }} />
        Loads (right axis)
      </span>
    </div>
  );
}

export function RevenueTrendChart({ data }: { data: MonthlyAnalyticsPoint[] }) {
  const c = useChartColors();
  // Thin out X-axis labels once there's real history (3 years = 36 points)
  // so ticks don't collide; every point is still hoverable via the tooltip.
  const tickInterval = data.length > 18 ? Math.ceil(data.length / 12) : 0;
  // netRevenue is only ever attached for internal (non-customer-scoped)
  // callers — see the analytics route — so its presence here is what
  // decides whether this render shows the gross/net split or the single
  // line the customer dashboard has always shown.
  const hasNet = data.some((d) => d.netRevenue !== undefined);

  if (data.length === 0) {
    return <div className="chart-empty">No load history in this range.</div>;
  }

  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke={c["--line-soft"]} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: c["--muted"] }} interval={tickInterval} tickLine={false} axisLine={{ stroke: c["--line"] }} />
          <YAxis
            yAxisId="revenue"
            tick={{ fontSize: 11, fill: c["--muted"] }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => fmtMoneyCompact(v)}
            width={72}
          />
          <YAxis
            yAxisId="loads"
            orientation="right"
            tick={{ fontSize: 11, fill: c["--muted"] }}
            tickLine={false}
            axisLine={false}
            width={36}
            allowDecimals={false}
          />
          <Tooltip content={<ChartTooltip hasNet={hasNet} />} cursor={{ fill: c["--line-soft"] }} />
          <Bar yAxisId="loads" dataKey="loads" fill={c["--accent-bg"]} radius={[4, 4, 0, 0]} barSize={10} />
          <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke={c["--accent"]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          {hasNet && (
            <Line yAxisId="revenue" type="monotone" dataKey="netRevenue" stroke={c["--success"]} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <ChartLegend c={c} hasNet={hasNet} />
    </>
  );
}
