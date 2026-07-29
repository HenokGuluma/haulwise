// Route-level loading skeletons, rendered by each route's loading.tsx while
// its server component's data fetch is still in flight — this is what makes
// a tab switch show something instantly instead of the browser just sitting
// on the old page until the new one is fully ready.

function Block({ w, h, r = 8, style }: { w?: string | number; h: number; r?: number; style?: React.CSSProperties }) {
  return <div className="skel" style={{ width: w ?? "100%", height: h, borderRadius: r, ...style }} />;
}

export function KpiGridSkeleton() {
  return (
    <div className="kpi-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="kpi-card">
          <Block w={52} h={52} r={15} />
          <div className="kpi-body">
            <Block w="60%" h={13} style={{ marginBottom: 8 }} />
            <Block w="45%" h={30} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartGridSkeleton() {
  return (
    <>
      <div className="analytics-grid">
        <div className="card chart-card"><Block w="40%" h={16} style={{ marginBottom: 16 }} /><Block h={220} r={10} /></div>
        <div className="card chart-card"><Block w="40%" h={16} style={{ marginBottom: 16 }} /><Block h={220} r={10} /></div>
      </div>
      <div className="analytics-grid-row2">
        <div className="card chart-card"><Block w="40%" h={16} style={{ marginBottom: 16 }} /><Block h={220} r={10} /></div>
        <div className="card chart-card"><Block w="40%" h={16} style={{ marginBottom: 16 }} /><Block h={220} r={10} /></div>
      </div>
    </>
  );
}

export function PanelsSkeleton() {
  return (
    <div className="panels-grid-uneven" style={{ marginTop: 16 }}>
      <div className="card" style={{ padding: 20 }}>
        <Block w="35%" h={16} style={{ marginBottom: 16 }} />
        {Array.from({ length: 4 }).map((_, i) => <Block key={i} h={40} r={10} style={{ marginBottom: 8 }} />)}
      </div>
      <div className="card" style={{ padding: 20 }}>
        <Block w="20%" h={16} style={{ marginBottom: 16 }} />
        {Array.from({ length: 3 }).map((_, i) => <Block key={i} h={28} r={8} style={{ marginBottom: 8 }} />)}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      <KpiGridSkeleton />
      <ChartGridSkeleton />
      <PanelsSkeleton />
    </div>
  );
}

export function TableSkeleton({ rows = 8, toolbarFilters = 2 }: { rows?: number; toolbarFilters?: number }) {
  return (
    <div className="dt-wrap">
      <div className="dt-toolbar">
        <Block w={280} h={38} r={10} />
        {Array.from({ length: toolbarFilters }).map((_, i) => <Block key={i} w={110} h={30} r={8} />)}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Block w={32} h={32} r={8} />
          <Block w={32} h={32} r={8} />
          <Block w={100} h={32} r={8} />
        </div>
      </div>
      <div className="card dt-table-card" style={{ padding: 14 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 24, padding: "10px 4px" }}>
            <Block w="14%" h={13} />
            <Block w="20%" h={13} />
            <Block w="16%" h={13} />
            <Block w="10%" h={13} />
            <Block w="10%" h={13} />
            <Block w="12%" h={13} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div>
      <div className="dt-toolbar" style={{ marginBottom: 12 }}>
        <Block w={240} h={38} r={10} />
        <Block w={160} h={38} r={10} />
        <Block w={150} h={38} r={10} />
        <Block w={140} h={38} r={10} />
      </div>
      <Block h={40} r={10} style={{ marginBottom: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="board-col" style={{ maxHeight: 340 }}>
            <div className="board-col-head">
              <Block w={46} h={46} r={13} />
              <Block w="50%" h={15} />
            </div>
            <div className="board-col-body">
              {Array.from({ length: 2 }).map((_, j) => <Block key={j} h={120} r={12} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div>
      <Block w={220} h={22} style={{ marginBottom: 20 }} />
      <div className="panels-grid-uneven">
        <div className="card" style={{ padding: 20 }}>
          {Array.from({ length: 5 }).map((_, i) => <Block key={i} h={16} style={{ marginBottom: 12 }} />)}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <Block h={140} r={10} />
        </div>
      </div>
    </div>
  );
}

export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="stat-grid-3" style={{ marginBottom: 18 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="kpi-card">
          <div className="kpi-body">
            <Block w="50%" h={13} style={{ marginBottom: 8 }} />
            <Block w="40%" h={30} />
          </div>
        </div>
      ))}
    </div>
  );
}
