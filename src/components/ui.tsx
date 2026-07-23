"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { statusClass } from "@/lib/format";

/* =========================================================================
   ICONS
   ========================================================================= */
const ICONS: Record<string, string> = {
  grid: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>',
  columns: '<rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line>',
  list: '<line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
  fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
  search: '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>',
  x: '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',
  alertTriangle: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>',
  clock: '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>',
  truck: '<rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line>',
  edit: '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>',
  trash: '<polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>',
  arrowRight: '<line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline>',
  refresh: '<polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>',
  package: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.77z"></path>',
  logOut: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>',
};

export function Icon({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: ICONS[name] || "" }}
    />
  );
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

type ButtonVariant = "primary" | "dark" | "ghost" | "danger-ghost";
export function Button({
  variant = "ghost",
  size = "md",
  icon,
  children,
  className = "",
  ...rest
}: {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  icon?: string;
  children?: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = ["btn", "btn-" + variant, size === "sm" ? "btn-sm" : "", className].join(" ").trim();
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} />}
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

export function Drawer({ onClose, children, width }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  useEscape(onClose);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer" style={width ? { width } : undefined} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function ModalBox({ onClose, children, width }: { onClose: () => void; children: React.ReactNode; width?: number }) {
  useEscape(onClose);
  return (
    <div className="overlay center" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box" style={width ? { width } : undefined} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function PanelHead({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="panel-head">
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15.5 }}>{title}</div>
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
