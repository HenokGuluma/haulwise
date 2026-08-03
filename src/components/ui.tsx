"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard, Kanban, ClipboardList, Users, FileText, Plus, Search, X,
  AlertTriangle, CheckCircle2, Clock, Truck, CalendarDays, Upload, Download,
  Pencil, Trash2, ArrowRight, ArrowLeft, RefreshCw, Package, Wrench, LogOut,
  Sun, Moon, Briefcase, Box, Snowflake, Layers, Zap, Copy, ChevronLeft,
  ChevronRight, ChevronUp, ChevronDown, MapPin, GripVertical, Warehouse,
  Route, Banknote, Sparkles, Settings, Database, TrendingUp, PieChart,
  BarChart3, Shield, Phone, Mail, type LucideIcon,
} from "lucide-react";
import { statusClass } from "@/lib/format";

/* =========================================================================
   ICONS — lucide-react, mapped by the same string keys used across the app
   ========================================================================= */
const ICONS: Record<string, LucideIcon> = {
  grid: LayoutDashboard,
  columns: Kanban,
  list: ClipboardList,
  users: Users,
  fileText: FileText,
  plus: Plus,
  search: Search,
  x: X,
  alertTriangle: AlertTriangle,
  checkCircle: CheckCircle2,
  clock: Clock,
  truck: Truck,
  calendar: CalendarDays,
  upload: Upload,
  download: Download,
  edit: Pencil,
  trash: Trash2,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  refresh: RefreshCw,
  package: Package,
  wrench: Wrench,
  logOut: LogOut,
  sun: Sun,
  moon: Moon,
  briefcase: Briefcase,
  // Equipment types (dispatch board card badges)
  box: Box,
  snowflake: Snowflake,
  layers: Layers,
  zap: Zap,
  // Misc additions for richer, logistics-themed UI
  copy: Copy,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  chevronUp: ChevronUp,
  chevronDown: ChevronDown,
  mapPin: MapPin,
  gripVertical: GripVertical,
  warehouse: Warehouse,
  route: Route,
  money: Banknote,
  sparkles: Sparkles,
  settings: Settings,
  database: Database,
  trendingUp: TrendingUp,
  pieChart: PieChart,
  barChart: BarChart3,
  shield: Shield,
  phone: Phone,
  mail: Mail,
};

export function Icon({ name, size = 16, className = "", style }: { name: string; size?: number; className?: string; style?: React.CSSProperties }) {
  const Component = ICONS[name];
  if (!Component) return null;
  return <Component size={size} strokeWidth={1.8} className={className} style={style} />;
}

/* =========================================================================
   TOASTS
   ========================================================================= */
type ToastApi = { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };
const ToastCtx = createContext<ToastApi | null>(null);
export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

let toastSeq = 0;
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<{ id: number; type: string; message: string }[]>([]);
  function push(type: string, message: string) {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }
  function dismiss(id: number) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }
  const api: ToastApi = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={"toast " + t.type}>
            <Icon name={t.type === "error" ? "alertTriangle" : t.type === "success" ? "checkCircle" : "clock"} />
            <div style={{ flex: 1 }}>{t.message}</div>
            <button className="toast-close" onClick={() => dismiss(t.id)}>
              <Icon name="x" size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* =========================================================================
   ATOMS
   ========================================================================= */
export function Pill({ children, tone = "muted", dot = false }: { children: React.ReactNode; tone?: string; dot?: boolean }) {
  return (
    <span className={"pill pill-" + tone}>
      {dot && <span className="pill-dot"></span>}
      {children}
    </span>
  );
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span className={"pill " + statusClass(status)}>
      <span className="pill-dot"></span>
      {label}
    </span>
  );
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="btn-spinner">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="42" strokeDashoffset="14" opacity="0.85" />
    </svg>
  );
}

type ButtonVariant = "primary" | "dark" | "ghost" | "danger-ghost";
export function Button({
  variant = "ghost",
  size = "md",
  icon,
  loading = false,
  children,
  className = "",
  disabled,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: string;
  loading?: boolean;
  children?: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = ["btn", "btn-" + variant, size === "sm" ? "btn-sm" : "", className].join(" ").trim();
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner size={size === "sm" ? 12 : 14} /> : icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  title,
  ...rest
}: { icon: string; title: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="icon-btn" title={title} aria-label={title} {...rest}>
      <Icon name={icon} />
    </button>
  );
}

export function EmptyState({ icon = "package", title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <Icon name={icon} size={30} />
      <h4>{title}</h4>
      {hint && <p>{hint}</p>}
    </div>
  );
}

function useEscape(onEscape: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onEscape]);
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Traps Tab/Shift+Tab within the dialog and restores focus to the trigger element on unmount. */
function useFocusTrap(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable[0] ?? container).focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !container) return;
      const items = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [containerRef]);
}

export function Drawer({ onClose, children, width }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  useEscape(onClose);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="drawer" role="dialog" aria-modal="true" tabIndex={-1} style={width ? { width } : undefined} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ModalBox({ onClose, children, width }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  useEscape(onClose);
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  return (
    <div className="overlay center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="modal-box" role="dialog" aria-modal="true" tabIndex={-1} style={width ? { width } : undefined} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function PanelHead({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="panel-head">
      <div style={{ flex: 1 }}>
        <div className="panel-title">{title}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{sub}</div>}
      </div>
      <IconButton icon="x" title="Close" onClick={onClose} />
    </div>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {error && <div className="err-text">{error}</div>}
      {!error && hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Banner({ tone = "warning", children }: { tone?: "warning" | "danger"; children: React.ReactNode }) {
  return (
    <div className={"banner banner-" + tone}>
      <Icon name="alertTriangle" />
      <div>{children}</div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalBox onClose={onCancel} width={380}>
      <PanelHead title={title} onClose={onCancel} />
      <div className="panel-body">
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>{message}</p>
      </div>
      <div className="panel-foot">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button
          variant="danger-ghost"
          onClick={onConfirm}
          style={{ background: "var(--danger)", color: "#fff", borderColor: "var(--danger)" }}
        >
          {confirmLabel}
        </Button>
      </div>
    </ModalBox>
  );
}
