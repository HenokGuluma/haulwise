"use client";

import { Icon } from "@/components/ui";
import { routeProgress } from "@/lib/format";
import type { LoadStatus } from "@/types";

export function RouteLine({ status, pickup, delivery }: { status: LoadStatus; pickup: string; delivery: string }) {
  const active = status === "DISPATCHED" || status === "IN_TRANSIT";
  const arrived = status === "DELIVERED" || status === "BILLED";
  const progress = arrived ? 1 : active ? routeProgress(pickup, delivery) : 0;
  const pct = Math.round(progress * 100);

  return (
    <div className="route-line" title={active ? pct + "% of transit window elapsed" : undefined}>
      <div className="track"></div>
      {(active || arrived) && <div className="track-fill" style={{ width: pct + "%" }}></div>}
      <div className="node start"></div>
      <div className={"node end" + (arrived ? " arrived" : "")}></div>
      {(active || arrived) && (
        <div className="truck" style={{ left: (arrived ? 100 : pct) + "%" }}>
          <Icon name="truck" size={14} />
        </div>
      )}
    </div>
  );
}
