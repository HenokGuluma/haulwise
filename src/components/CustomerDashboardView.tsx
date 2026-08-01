"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, StatusPill, useToast } from "@/components/ui";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { KPI } from "@/components/DashboardView";
import { fmtMoney, statusLabel } from "@/lib/format";
import { useAnalytics } from "@/lib/useAnalytics";
import { api, ApiRequestError } from "@/lib/api-client";
import { RevenueTrendChart } from "@/components/charts/RevenueTrendChart";
import { StatusBreakdownChart } from "@/components/charts/StatusBreakdownChart";
import type { Load, SessionUser, LoadStatus } from "@/types";

export type CustomerDashboardStats = {
  activeCount: number;
  inTransitCount: number;
  deliveredThisWeekCount: number;
  billedThisWeek: number;
  pickupsToday: { id: string; loadNumber: string; origin: string; status: LoadStatus }[];
  deliveriesToday: { id: string; loadNumber: string; destination: string; status: LoadStatus }[];
  pickupsUpcoming: { id: string; loadNumber: string; origin: string; status: LoadStatus }[];
  deliveriesUpcoming: { id: string; loadNumber: string; destination: string; status: LoadStatus }[];
};

function ShipmentList({
  title,
  icon,
  pickups,
  deliveries,
  openingId,
  onOpen,
}: {
  title: string;
  icon: string;
  pickups: { id: string; loadNumber: string; origin: string; status: LoadStatus }[];
  deliveries: { id: string; loadNumber: string; destination: string; status: LoadStatus }[];
  openingId: string | null;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="section-title">
        <span className="section-title-icon" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
          <Icon name={icon} size={16} />
        </span>
        {title}
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="dash-subhead">
          <Icon name="mapPin" size={13} />
          Pickups <span className="count">({pickups.length})</span>
        </div>
        {pickups.length === 0 ? (
          <div className="dash-empty">No pickups scheduled.</div>
        ) : (
          pickups.map((l) => (
            <div
              key={l.id}
              className="dash-row"
              style={openingId === l.id ? { opacity: 0.5, pointerEvents: "none" } : undefined}
              onClick={() => onOpen(l.id)}
            >
              <span><span className="mono" style={{ color: "var(--muted)" }}>{l.loadNumber}</span> · {l.origin}</span>
              <StatusPill status={l.status} label={statusLabel(l.status)} />
            </div>
          ))
        )}
      </div>
      <div>
        <div className="dash-subhead">
          <Icon name="checkCircle" size={13} />
          Deliveries <span className="count">({deliveries.length})</span>
        </div>
        {deliveries.length === 0 ? (
          <div className="dash-empty">No deliveries scheduled.</div>
        ) : (
          deliveries.map((l) => (
            <div
              key={l.id}
              className="dash-row"
              style={openingId === l.id ? { opacity: 0.5, pointerEvents: "none" } : undefined}
              onClick={() => onOpen(l.id)}
            >
              <span><span className="mono" style={{ color: "var(--muted)" }}>{l.loadNumber}</span> · {l.destination}</span>
              <StatusPill status={l.status} label={statusLabel(l.status)} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function CustomerDashboardView({ stats, user }: { stats: CustomerDashboardStats; user: SessionUser }) {
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();
  const { data: analytics } = useAnalytics();

  async function openLoad(id: string) {
    setOpeningId(id);
    try {
      const res = await api.get<{ load: Load }>(`/api/loads/${id}`);
      setDetailLoad(res.load);
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : "Couldn't load details.");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div>
      <div className="kpi-grid">
        <KPI label="Active Shipments" value={stats.activeCount} icon="package" iconTone="accent" href="/loads?status=DRAFT,ASSIGNED,DISPATCHED,IN_TRANSIT" />
        <KPI label="In Transit" value={stats.inTransitCount} icon="truck" iconTone="success" href="/loads?status=IN_TRANSIT" />
        <KPI label="Delivered This Week" value={stats.deliveredThisWeekCount} icon="checkCircle" iconTone="route" href="/loads?status=DELIVERED,BILLED" />
        <KPI label="Billed This Week" value={fmtMoney(stats.billedThisWeek)} icon="money" iconTone="amber" tone="success" highlight href="/loads?status=DELIVERED,BILLED" />
      </div>

      <div className="analytics-grid">
        <div className="card chart-card">
          <div className="section-title">
            <span className="section-title-icon" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              <Icon name="trendingUp" size={16} />
            </span>
            Your shipments over time
          </div>
          <RevenueTrendChart data={analytics.monthly} />
        </div>
        <div className="card chart-card">
          <div className="section-title">
            <span className="section-title-icon" style={{ background: "var(--purple-bg)", color: "var(--purple)" }}>
              <Icon name="pieChart" size={16} />
            </span>
            Shipments by status
          </div>
          <StatusBreakdownChart data={analytics.statusBreakdown} />
        </div>
      </div>

      <div className="panels-grid-uneven" style={{ marginTop: 16 }}>
        <ShipmentList title="Today" icon="calendar" pickups={stats.pickupsToday} deliveries={stats.deliveriesToday} openingId={openingId} onOpen={openLoad} />
        <ShipmentList title="Upcoming (Next 7 Days)" icon="calendar" pickups={stats.pickupsUpcoming} deliveries={stats.deliveriesUpcoming} openingId={openingId} onOpen={openLoad} />
      </div>

      {detailLoad && (
        <LoadDetailDrawer
          load={detailLoad}
          user={user}
          onClose={() => setDetailLoad(null)}
          onUpdated={(l) => { setDetailLoad(l); router.refresh(); }}
          onDeleted={() => { setDetailLoad(null); router.refresh(); }}
          onAssign={() => {}}
          onEdit={() => {}}
        />
      )}
    </div>
  );
}
