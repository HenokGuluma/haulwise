"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon, StatusPill, useToast } from "@/components/ui";
import { LoadDetailDrawer } from "@/components/modals/LoadDetailDrawer";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import { fmtMoney, fitFontSize, daysUntil, statusLabel } from "@/lib/format";
import { useAnalytics } from "@/lib/useAnalytics";
import { api, ApiRequestError } from "@/lib/api-client";
import { DASHBOARD_PERIODS, DASHBOARD_PERIOD_LABELS, type DashboardPeriod } from "@/lib/dashboard-period";
import { RevenueTrendChart } from "@/components/charts/RevenueTrendChart";
import { StatusBreakdownChart } from "@/components/charts/StatusBreakdownChart";
import { TopCustomersChart } from "@/components/charts/TopCustomersChart";
import { EquipmentVolumeChart } from "@/components/charts/EquipmentVolumeChart";
import type { Load, Driver, Equipment, SessionUser, LoadStatus } from "@/types";

export const KPI_TONES: Record<string, { bg: string; fg: string }> = {
  accent: { bg: "var(--accent-bg)", fg: "var(--accent)" },
  success: { bg: "var(--success-bg)", fg: "var(--success)" },
  route: { bg: "var(--route-bg)", fg: "var(--route)" },
  amber: { bg: "var(--amber-bg)", fg: "var(--amber-ink)" },
};

export function KPI({
  label,
  value,
  icon,
  iconTone = "accent",
  tone,
  deltaIcon,
  deltaText,
  highlight,
  href,
}: {
  label: string;
  value: string | number;
  icon: string;
  iconTone?: keyof typeof KPI_TONES;
  tone?: "success" | "danger";
  deltaIcon?: string;
  deltaText?: string;
  highlight?: boolean;
  /** Makes the whole card a link, e.g. to the Loads view pre-filtered for this metric. */
  href?: string;
}) {
  const c = KPI_TONES[iconTone];
  const content = (
    <>
      <span className="kpi-icon-badge" style={{ background: c.bg, color: c.fg }}>
        <Icon name={icon} size={28} />
      </span>
      <div className="kpi-body">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value" style={typeof value === "string" ? { fontSize: fitFontSize(value, 32) } : undefined}>{value}</div>
        {deltaText && (
          <div
            className="kpi-delta"
            style={
              tone === "danger"
                ? { color: "var(--danger)", background: "var(--danger-bg)" }
                : tone === "success"
                ? { color: "var(--success)", background: "var(--success-bg)" }
                : undefined
            }
          >
            {deltaIcon && <Icon name={deltaIcon} size={12} />}
            {deltaText}
          </div>
        )}
      </div>
    </>
  );
  const cls = "kpi-card" + (highlight ? " highlight" : "") + (href ? " kpi-card-link" : "");
  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    );
  }
  return <div className={cls}>{content}</div>;
}

export type DashboardStats = {
  activeCount: number;
  inTransitCount: number;
  /** Which period the fields below (deliveredCount/grossVolume/revenue/periodFromIso/periodToIso) are scoped to. */
  period: DashboardPeriod;
  deliveredCount: number;
  /** Gross customer billing for the period (sum of rate) — what "Revenue" used to mean before the net split below. */
  grossVolume: number;
  /** Each delivered load's rate minus its driverPay, summed — the company's actual take after the driver-pay split. */
  revenue: number;
  periodFromIso: string;
  periodToIso: string;
  unassigned: { id: string; loadNumber: string }[];
  pickupsToday: { id: string; loadNumber: string; origin: string; status: LoadStatus }[];
  deliveriesToday: { id: string; loadNumber: string; destination: string; status: LoadStatus }[];
};

export function DashboardView({
  stats: initialStats,
  drivers,
  equipment,
  user,
}: {
  stats: DashboardStats;
  drivers: Driver[];
  equipment: Equipment[];
  user?: SessionUser;
}) {
  const [stats, setStats] = useState(initialStats);
  useEffect(() => setStats(initialStats), [initialStats]);
  const toast = useToast();

  // Delivered/Revenue period selector — separate from `stats` above since
  // switching it only ever needs to refetch the one cheap aggregate below,
  // never the unassigned/pickups/deliveries panels (those aren't
  // period-scoped). Server-rendered initialStats already covers "week" for
  // free, so only month/year trigger a client fetch, and switching back to
  // week reuses initialStats again instead of refetching it.
  const [period, setPeriod] = useState<DashboardPeriod>(initialStats.period);
  const [periodStats, setPeriodStats] = useState(initialStats);
  const [periodLoading, setPeriodLoading] = useState(false);
  useEffect(() => {
    if (period === initialStats.period) {
      setPeriodStats(initialStats);
      return;
    }
    let cancelled = false;
    setPeriodLoading(true);
    api
      .get<{ deliveredCount: number; grossVolume: number; revenue?: number; fromIso: string; toIso: string }>(
        `/api/dashboard/kpis?period=${period}`
      )
      .then((res) => {
        if (cancelled) return;
        setPeriodStats((prev) => ({
          ...prev,
          period,
          deliveredCount: res.deliveredCount,
          grossVolume: res.grossVolume,
          revenue: res.revenue ?? prev.revenue,
          periodFromIso: res.fromIso,
          periodToIso: res.toIso,
        }));
      })
      .catch((err) => toast.error(err instanceof ApiRequestError ? err.message : "Couldn't load that period."))
      .finally(() => { if (!cancelled) setPeriodLoading(false); });
    return () => { cancelled = true; };
  }, [period, initialStats, toast]);

  // The "Needs attention" / "Today" lists only carry the few fields needed
  // to render a row — opening one lazy-fetches the full Load (documents,
  // activity, etc.) on demand instead of the dashboard preloading every
  // load's full relations just so a handful of rows are clickable.
  const [detailLoad, setDetailLoad] = useState<Load | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const router = useRouter();
  // Defaults to "all time" — matches this route's pre-filter behavior, so
  // nothing changes for anyone who never touches the picker.
  const [range, setRange] = useState<DateRange>({ from: null, to: null });
  const { data: analytics, loading: analyticsLoading } = useAnalytics(range);

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

  // Each KPI card links to Loads pre-filtered to exactly the set it's
  // counting — the Delivered/Revenue cards pass whatever period bounds
  // produced the currently-shown numbers, so the destination table always
  // matches exactly, regardless of which period is selected.
  const activeLoadsHref = "/loads?status=DRAFT,ASSIGNED,DISPATCHED,IN_TRANSIT";
  const inTransitHref = "/loads?status=IN_TRANSIT";
  const deliveredHref = `/loads?status=DELIVERED,BILLED&deliveredFrom=${encodeURIComponent(periodStats.periodFromIso)}&deliveredTo=${encodeURIComponent(periodStats.periodToIso)}`;
  const periodLabel = DASHBOARD_PERIOD_LABELS[period];

  const expiringDrivers = drivers.map((d) => ({ d, days: daysUntil(d.licenseExpiration) })).filter((x) => x.days <= 21).sort((a, b) => a.days - b.days);
  const maintenanceEquip = equipment.map((e) => ({ e, days: daysUntil(e.nextMaintenance) })).filter((x) => x.days <= 14).sort((a, b) => a.days - b.days);

  const attentionCount = stats.unassigned.length + expiringDrivers.length + maintenanceEquip.length;

  // Optimistic removal from the thin server-provided lists on update/delete
  // so a resolved item disappears immediately rather than waiting for the
  // background router.refresh() to bring back fresh server-computed stats.
  function dropFromLists(id: string) {
    setStats((prev) => ({
      ...prev,
      unassigned: prev.unassigned.filter((x) => x.id !== id),
      pickupsToday: prev.pickupsToday.filter((x) => x.id !== id),
      deliveriesToday: prev.deliveriesToday.filter((x) => x.id !== id),
    }));
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--muted)" }}>Delivered &amp; Revenue:</span>
        <div className="board-view-toggle" role="tablist" aria-label="Delivered and Revenue period">
          {DASHBOARD_PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={period === p}
              className={"board-view-toggle-btn" + (period === p ? " active" : "")}
              onClick={() => setPeriod(p)}
            >
              {DASHBOARD_PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
      <div className="kpi-grid" style={{ opacity: periodLoading ? 0.6 : 1, transition: "opacity 0.15s ease" }}>
        <KPI label="Active Loads" value={stats.activeCount} icon="package" iconTone="accent" href={activeLoadsHref} />
        <KPI label="In Transit" value={stats.inTransitCount} icon="truck" iconTone="success" href={inTransitHref} />
        <KPI label={"Delivered " + periodLabel} value={periodStats.deliveredCount} icon="checkCircle" iconTone="route" href={deliveredHref} />
        <KPI
          label={"Revenue " + periodLabel}
          value={fmtMoney(periodStats.revenue)}
          icon="money"
          iconTone="amber"
          highlight
          href={deliveredHref}
          deltaIcon="layers"
          deltaText={"Gross Volume: " + fmtMoney(periodStats.grossVolume)}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <div className="analytics-grid" style={{ opacity: analyticsLoading ? 0.6 : 1, transition: "opacity 0.15s ease" }}>
        <div className="card chart-card">
          <div className="section-title">
            <span className="section-title-icon" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              <Icon name="trendingUp" size={16} />
            </span>
            Gross Volume &amp; Revenue over time
          </div>
          <RevenueTrendChart data={analytics.monthly} />
        </div>
        <div className="card chart-card">
          <div className="section-title">
            <span className="section-title-icon" style={{ background: "var(--purple-bg)", color: "var(--purple)" }}>
              <Icon name="pieChart" size={16} />
            </span>
            Loads by status
          </div>
          <StatusBreakdownChart data={analytics.statusBreakdown} />
        </div>
      </div>

      <div className="analytics-grid-row2" style={{ opacity: analyticsLoading ? 0.6 : 1, transition: "opacity 0.15s ease" }}>
        <div className="card chart-card">
          <div className="section-title">
            <span className="section-title-icon" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
              <Icon name="briefcase" size={16} />
            </span>
            Top customers by volume
          </div>
          <TopCustomersChart data={analytics.topCustomers} />
        </div>
        <div className="card chart-card">
          <div className="section-title">
            <span className="section-title-icon" style={{ background: "var(--amber-bg)", color: "var(--amber-ink)" }}>
              <Icon name="barChart" size={16} />
            </span>
            Equipment volume {range.from ? "(selected range)" : "(last 12 months)"}
          </div>
          <EquipmentVolumeChart data={analytics.equipmentVolume} />
        </div>
      </div>

      <div className="panels-grid-uneven" style={{ marginTop: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
            <div className="section-title" style={{ marginBottom: 0 }}>
              <span className="section-title-icon" style={{ background: "var(--danger-bg)", color: "var(--danger)" }}>
                <Icon name="alertTriangle" size={16} />
              </span>
              Needs attention
            </div>
            {attentionCount > 0 && <span className="pill pill-danger" style={{ marginLeft: "auto" }}>{attentionCount} items</span>}
          </div>

          {attentionCount === 0 ? (
            <div style={{ padding: "10px 0", color: "var(--muted)", fontSize: 13 }}>All clear — nothing needs attention right now.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stats.unassigned.map((l) => (
                <div
                  key={l.id}
                  className="banner banner-danger banner-clickable"
                  style={openingId === l.id ? { opacity: 0.5, pointerEvents: "none" } : undefined}
                  onClick={() => openLoad(l.id)}
                >
                  <Icon name="alertTriangle" />
                  <div><strong>{l.loadNumber}</strong> is Assigned but missing a driver or equipment.</div>
                </div>
              ))}
              {expiringDrivers.map(({ d, days }) => (
                <div key={d.id} className="banner banner-warning banner-clickable" onClick={() => router.push(`/roster?tab=drivers&driverId=${d.id}`)}>
                  <Icon name="alertTriangle" />
                  <div><strong>{d.firstName} {d.lastName}</strong>&apos;s license {days < 0 ? "expired" : `expires in ${days} day${days === 1 ? "" : "s"}`}.</div>
                </div>
              ))}
              {maintenanceEquip.map(({ e, days }) => (
                <div key={e.id} className="banner banner-warning banner-clickable" onClick={() => router.push(`/roster?tab=equipment&equipmentId=${e.id}`)}>
                  <Icon name="wrench" />
                  <div><strong>{e.unitNumber}</strong> maintenance {days < 0 ? "is overdue" : `due in ${days} day${days === 1 ? "" : "s"}`}.</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div className="section-title">
            <span className="section-title-icon" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              <Icon name="calendar" size={16} />
            </span>
            Today
          </div>
          <div style={{ marginBottom: 16 }}>
            <div className="dash-subhead">
              <Icon name="mapPin" size={13} />
              Pickups <span className="count">({stats.pickupsToday.length})</span>
            </div>
            {stats.pickupsToday.length === 0 ? (
              <div className="dash-empty">No pickups scheduled today.</div>
            ) : (
              stats.pickupsToday.map((l) => (
                <div
                  key={l.id}
                  className="dash-row"
                  style={openingId === l.id ? { opacity: 0.5, pointerEvents: "none" } : undefined}
                  onClick={() => openLoad(l.id)}
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
              Deliveries <span className="count">({stats.deliveriesToday.length})</span>
            </div>
            {stats.deliveriesToday.length === 0 ? (
              <div className="dash-empty">No deliveries scheduled today.</div>
            ) : (
              stats.deliveriesToday.map((l) => (
                <div
                  key={l.id}
                  className="dash-row"
                  style={openingId === l.id ? { opacity: 0.5, pointerEvents: "none" } : undefined}
                  onClick={() => openLoad(l.id)}
                >
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
          onClose={() => setDetailLoad(null)}
          onUpdated={(l) => { setDetailLoad(l); dropFromLists(l.id); router.refresh(); }}
          onDeleted={() => { dropFromLists(detailLoad.id); setDetailLoad(null); router.refresh(); }}
          onAssign={() => router.push("/board")}
          onEdit={() => router.push("/loads")}
        />
      )}
    </div>
  );
}
