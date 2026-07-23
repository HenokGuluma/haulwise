"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { useChartColors, type ChartColors } from "@/lib/useChartColors";
import type { StatusBreakdownPoint } from "@/types";

function statusColor(status: string, c: ChartColors): string {
  switch (status) {
    case "DRAFT": return c["--slate"];
    case "ASSIGNED": return c["--route"];
    case "DISPATCHED": return c["--purple"];
    case "IN_TRANSIT": return c["--amber"];
    case "DELIVERED": return c["--success"];
    case "BILLED": return c["--navy-status"];
    default: return c["--slate"];
  }
}

export function StatusBreakdownChart({ data }: { data: StatusBreakdownPoint[] }) {
  const c = useChartColors();
  const total = data.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return <div className="chart-empty">No loads yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="label" cx="50%" cy="46%" innerRadius={58} outerRadius={88} paddingAngle={2} strokeWidth={0}>
          {data.map((d) => (
            <Cell key={d.status} fill={statusColor(d.status, c)} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => {
            const n = Number(value ?? 0);
            return [`${n} load${n === 1 ? "" : "s"}`, String(name)];
          }}
          contentStyle={{ background: c["--surface-raised"], border: "1px solid " + c["--line"], borderRadius: 10, fontSize: 12.5 }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          formatter={(value: string) => <span style={{ fontSize: 12, color: c["--ink-soft"] }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
