"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { fmtMoney, fmtMoneyCompact } from "@/lib/format";
import { useChartColors } from "@/lib/useChartColors";
import type { TopCustomerPoint } from "@/types";

export function TopCustomersChart({ data }: { data: TopCustomerPoint[] }) {
  const c = useChartColors();

  if (data.length === 0) {
    return <div className="chart-empty">No customer revenue yet.</div>;
  }

  // Longest bar first reading top-to-bottom, which means last-in-array for
  // recharts' default bottom-up vertical layout — reverse so #1 is on top.
  const rows = [...data].reverse();

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 34)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={c["--line-soft"]} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: c["--muted"] }} tickFormatter={(v) => fmtMoneyCompact(v)} tickLine={false} axisLine={{ stroke: c["--line"] }} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: c["--ink-soft"] }} tickLine={false} axisLine={false} />
        <Tooltip
          formatter={(value) => [fmtMoney(Number(value ?? 0)), "Revenue"]}
          contentStyle={{ background: c["--surface-raised"], border: "1px solid " + c["--line"], borderRadius: 10, fontSize: 12.5 }}
          cursor={{ fill: c["--line-soft"] }}
        />
        <Bar dataKey="revenue" radius={[0, 6, 6, 0]} barSize={16}>
          {rows.map((r) => (
            <Cell key={r.name} fill={c["--accent"]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
