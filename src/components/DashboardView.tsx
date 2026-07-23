"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, StatusPill } from "@/components/ui";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { fmtMoney, daysUntil, statusLabel } from "@/lib/format";
import type { Load, Driver, Equipment, SessionUser } from "@/types";

function KPI({ label, value, tone, deltaIcon, deltaText, highlight }: { label: string; value: string | number; tone?: "success" | "danger"; deltaIcon?: string; deltaText?: string; highlight?: boolean }) {
  return (
    <div className={"kpi-card" + (highlight ? " highlight" : "")}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {deltaText && (
        <div className="kpi-delta" style={{ color: tone === "danger" ? "var(--danger)" : tone === "success" ? "var(--success)" : "var(--muted)" }}>
          {deltaIcon && <Icon name={deltaIcon} size={12} />}
          {deltaText}
        </div>
      )}
    </div>
  );
}

export function DashboardView({
  initialLoads,
  drivers,
  equipment,
  user,
}: {
  initialLoads: Load[];
  drivers: Driver[];
  equipment: Equipment[];
  user?: SessionUser;
}) {
  const [loads, setLoads] = useState(initialLoads);
  useEffect(() => setLoads(initialLoads), [initialLoads]);
  const [detailLoadId, setDetailLoadId] = useState<string | null>(null);
  const router = useRouter();

  const active = loads.filter((l) => l.status !== "DELIVERED" && l.status !== "BILLED");
  const inTransit = loads.filter((l) => l.status === "IN_TRANSIT");
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const deliveredThisWeek = loads.filter(
    (l) => (l.status === "DELIVERED" || l.status === "BILLED") && new Date(l.deliveryTime).getTime() >= weekAgo && new Date(l.deliveryTime).getTime() <= now
  );
  const revenueThisWeek = deliveredThisWeek.reduce((s, l) => s + l.rate, 0);
  const unassigned = loads.filter((l) => l.status === "ASSIGNED" && (!l.driverId || !l.equipmentId));

  const expiringDrivers = drivers.map((d) => ({ d, days: daysUntil(d.licenseExpiration) })).filter((x) => x.days <= 21).sort((a, b) => a.days - b.days);
  const maintenanceEquip = equipment.map((e) => ({ e, days: daysUntil(e.nextMaintenance) })).filter((x) => x.days <= 14).sort((a, b) => a.days - b.days);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const isToday = (iso: string) => { const d = new Date(iso); return d >= today && d < tomorrow; };
  const pickupsToday = loads.filter((l) => isToday(l.pickupTime));
  const deliveriesToday = loads.filter((l) => isToday(l.deliveryTime));

  const attentionCount = unassigned.length + expiringDrivers.length + maintenanceEquip.length;
  const detailLoad = detailLoadId ? loads.find((l) => l.id === detailLoadId) ?? null : null;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 22 }}>
        <KPI label="Active Loads" value={active.length} />
        <KPI label="In Transit" value={inTransit.length} tone="success" deltaIcon="truck" deltaText="on the road now" />
        <KPI label="Delivered This Week" value={deliveredThisWeek.length} />
        <KPI label="Revenue This Week" value={fmtMoney(revenueThisWeek)} tone="success" highlight />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16, alignItems: "start" }}>
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Needs attention</div>
            {attentionCount > 0 && <span className="pill pill-danger" style={{ marginLeft: "auto" }}>{attentionCount} items</span>}
          </div>

          {attentionCount === 0 ? (
            <div style={{ padding: "10px 0", color: "var(--muted)", fontSize: 13 }}>All clear — nothing needs attention right now.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unassigned.map((l) => (
                <div key={l.id} className="banner banner-danger" style={{ cursor: "pointer" }} onClick={() => setDetailLoadId(l.id)}>
                  <Icon name="alertTriangle" />
                  <div><strong>{l.loadNumber}</strong> is Assigned but missing a driver or equipment.</div>
                </div>
              ))}
              {expiringDrivers.map(({ d, days }) => (
                <div key={d.id} className="banner banner-warning" style={{ cursor: "pointer" }} onClick={() => router.push("/roster")}>
                  <Icon name="alertTriangle" />
                  <div><strong>{d.firstName} {d.lastName}</strong>&apos;s license {days < 0 ? "expired" : `expires in ${days} day${days === 1 ? "" : "s"}`}.</div>
                </div>
              ))}
              {maintenanceEquip.map(({ e, days }) => (
                <div key={e.id} className="banner banner-warning" style={{ cursor: "pointer" }} onClick={() => router.push("/roster")}>
                  <Icon name="wrench" />
                  <div><strong>{e.unitNumber}</strong> maintenance {days < 0 ? "is overdue" : `due in ${days} day${days === 1 ? "" : "s"}`}.</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="section-title">Today</div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>Pickups ({pickupsToday.length})</div>
            {pickupsToday.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No pickups scheduled today.</div>
            ) : (
              pickupsToday.map((l) => (
                <div key={l.id} onClick={() => setDetailLoadId(l.id)} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--line-soft)", cursor: "pointer" }}>
                  <span><span className="mono" style={{ color: "var(--muted)" }}>{l.loadNumber}</span> · {l.origin}</span>
                  <StatusPill status={l.status} label={statusLabel(l.status)} />
                </div>
              ))
            )}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 6 }}>Deliveries ({deliveriesToday.length})</div>
            {deliveriesToday.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--muted)" }}>No deliveries scheduled today.</div>
            ) : (
              deliveriesToday.map((l) => (
                <div key={l.id} onClick={() => setDetailLoadId(l.id)} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--line-soft)", cursor: "pointer" }}>
                  <span><span className="mono" style={{ color: "var(--muted)" }}>{l.loadNumber}</span> · {l.destination}</span>
                  <StatusPill status={l.status} label={statusLabel(l.status)} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {detailLoad && user && (
        <LoadDetailDrawer
          load={detailLoad}
          user={user}
          onClose={() => setDetailLoadId(null)}
          onUpdated={(l) => setLoads((prev) => prev.map((x) => (x.id === l.id ? l : x)))}
          onDeleted={() => { setLoads((prev) => prev.filter((x) => x.id !== detailLoad.id)); setDetailLoadId(null); router.refresh(); }}
          onAssign={() => router.push("/board")}
          onEdit={() => router.push("/loads")}
        />
      )}
    </div>
  );
}
