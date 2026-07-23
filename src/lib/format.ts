export function fmtMoney(n: number): string {
  return "$" + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function fmtDate(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric" });
}

export function fmtDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " +
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

export function daysUntil(d: Date | string): number {
  const date = typeof d === "string" ? new Date(d) : d;
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function routeProgress(pickup: Date | string, delivery: Date | string): number {
  const start = new Date(pickup).getTime();
  const end = new Date(delivery).getTime();
  const now = Date.now();
  if (end <= start) return 0;
  const p = (now - start) / (end - start);
  return Math.max(0, Math.min(1, p));
}

export function statusClass(status: string): string {
  return "status-" + status.replace(/_/g, "");
}

export function statusLabel(status: string): string {
  // DRAFT -> Draft, IN_TRANSIT -> In Transit
  return status
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

export function payoutLabel(status: string): string {
  if (status === "NOT_BILLED") return "Not Billed";
  return status[0] + status.slice(1).toLowerCase();
}

export function toCSV<T>(rows: T[], columns: { label: string; get: (row: T) => string | number }[]): string {
  const esc = (v: unknown) => {
    const s = String(v === undefined || v === null ? "" : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const header = columns.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(c.get(r))).join(",")).join("\n");
  return header + "\n" + body;
}
