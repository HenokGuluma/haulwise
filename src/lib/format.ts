// Users may have no last name (e.g. a single-word account holder) — trims
// the trailing space rather than showing "Edget " with dangling whitespace.
export function fullName(firstName: string, lastName: string): string {
  return lastName ? `${firstName} ${lastName}` : firstName;
}

export function fmtBytes(n: number): string {
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
}

// Single source of truth for the USD->ETB scale used when the platform
// switched currencies — applied once to convert every existing dollar
// figure (seed data, thresholds) to a realistic birr-scale amount, not a
// live/fluctuating FX rate.
export const USD_TO_ETB_RATE = 145;

export function fmtMoney(n: number): string {
  return "ETB " + Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// Single source of truth for the lbs->Quintal scale used when the platform
// switched weight units (1 quintal = 100kg) — applied once to convert every
// existing stored weight figure (seed data, thresholds) to a realistic
// quintal-scale amount, same treatment as USD_TO_ETB_RATE above.
export const LBS_PER_QUINTAL = 220.462;

export function fmtWeight(n: number): string {
  return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " Quintals";
}

// Abbreviated form for tight spaces (chart axis ticks) — full precision
// still shows in tooltips via fmtMoney. "ETB 33.8M" instead of
// "ETB 33,800,000" keeps axis width sane at ETB's larger figure scale.
export function fmtMoneyCompact(n: number): string {
  return "ETB " + new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(Number(n || 0));
}

// ETB amounts run noticeably longer than the USD figures the UI was
// originally tuned for (e.g. "ETB 1,912,345" vs "$14,720") — spots with a
// large fixed font-size (KPI cards, load card rates) need to shrink a step
// or two once the formatted string gets long, rather than overflowing or
// wrapping mid-number.
export function fitFontSize(text: string, base: number): number {
  const len = text.length;
  if (len <= 9) return base;
  if (len <= 12) return Math.round(base * 0.86);
  if (len <= 15) return Math.round(base * 0.74);
  return Math.round(base * 0.64);
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

export function fmtRelative(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return diffDays + " days ago";
  const months = Math.floor(diffDays / 30);
  if (months < 12) return months + (months === 1 ? " month ago" : " months ago");
  const years = Math.floor(months / 12);
  return years + (years === 1 ? " year ago" : " years ago");
}

// Returns Infinity for a missing date so "due within N days" style filters
// (days <= N) naturally treat "no date on file" as "not due".
export function daysUntil(d: Date | string | null | undefined): number {
  if (!d) return Infinity;
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
