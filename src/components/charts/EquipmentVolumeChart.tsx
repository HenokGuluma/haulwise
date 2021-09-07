"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { useChartColors, type ChartColors } from "@/lib/useChartColors";
import type { EquipmentVolumePoint } from "@/types";

// Mirrors the tone names in src/lib/equipment-types.ts, resolved to concrete
// colors via useChartColors (recharts needs real hex/rgb, not var()).
function toneColor(tone: string, c: ChartColors): string {
  switch (tone) {
    case "van": return c["--route"];
    case "reefer": return "#0EA5E9";
    case "flatbed": return c["--amber-ink"];
    case "power": return c["--accent"];
    case "success": return c["--success"];
    case "danger": return c["--danger"];
    default: return c["--slate"];
  }
}

export function EquipmentVolumeChart({ data }: { data: EquipmentVolumePoint[] }) {
  const c = useChartColors();

  if (data.length === 0) {
    return <div className="chart-empty">No load activity in the last 12 months.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke={c["--line-soft"]} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: c["--muted"] }} tickLine={false} axisLine={{ stroke: c["--line"] }} />
        <YAxis tick={{ fontSize: 11, fill: c["--muted"] }} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
        <Tooltip
          formatter={(value) => {
            const n = Number(value ?? 0);
            return [`${n} load${n === 1 ? "" : "s"}`, "Volume"];
          }}
          contentStyle={{ background: c["--surface-raised"], border: "1px solid " + c["--line"], borderRadius: 10, fontSize: 12.5 }}
          cursor={{ fill: c["--line-soft"] }}
        />
        <Bar dataKey="loads" radius={[6, 6, 0, 0]} barSize={36}>
          {data.map((d) => (
            <Cell key={d.label} fill={toneColor(d.tone, c)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
