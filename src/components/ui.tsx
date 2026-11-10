import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";

/* ---------------------------------- Logo ---------------------------------- */

export function GasLogo({ tone = "dark", compact = false }: { tone?: "light" | "dark"; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-xl bg-[var(--lime)] text-[var(--ink)] shadow-[0_4px_18px_rgba(198,242,78,0.22)] sm:h-9 sm:w-9">
        <Icon name="flask" size={19} strokeWidth={1.9} />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--ink)]/38" />
      </div>
      <div className="leading-none">
        <p
          className={`font-display text-[16.5px] font-bold tracking-[-0.02em] ${
            tone === "dark" ? "text-white" : "text-[var(--ink)]"
          }`}
        >
          GAS<span style={{ color: tone === "dark" ? "var(--lime)" : "var(--teal)" }}>LAB</span>
          <sup className="ml-0.5 text-[10.5px] font-medium tracking-normal opacity-60">9°</sup>
        </p>
        {!compact && (
          <p
            className={`mt-1 text-[10px] font-semibold uppercase tracking-[0.26em] ${
              tone === "dark" ? "text-white/62" : "text-[var(--ink)]/62"
            }`}
          >
            Ciencias naturales
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------- Modal --------------------------------- */

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  kicker?: string;
  icon?: IconName;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "light" | "dark";
}

const widths = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
};

export function Modal({
  open,
  onClose,
  children,
  title,
  kicker,
  icon = "flask",
  footer,
  size = "md",
  tone = "light",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#04181b]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        className={`modal-shell relative max-h-[92vh] w-full overflow-hidden rounded-t-[26px] sm:rounded-[26px] ${widths[size]} ${
          tone === "dark" ? "bg-[var(--deep)] text-white" : "bg-[var(--paper)] text-[var(--ink)]"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Ventana de diálogo"}
      >
        {(title || kicker) && (
          <div
            className={`flex items-start gap-3 border-b px-5 py-4 sm:px-6 ${
              tone === "dark" ? "border-white/10" : "border-[var(--line)]"
            }`}
          >
            <div className="icon-badge">
              <Icon name={icon} size={18} />
            </div>
            <div className="min-w-0 flex-1">
              {kicker && <p className="eyebrow mb-1">{kicker}</p>}
              <h2 className="font-display text-lg font-semibold tracking-[-0.02em]">{title}</h2>
            </div>
            <button className="icon-button -mr-1 shrink-0" onClick={onClose} aria-label="Cerrar">
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        <div className="scroll-slim max-h-[calc(92vh-160px)] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div
            className={`flex flex-wrap items-center justify-end gap-2 border-t px-5 py-3.5 sm:px-6 ${
              tone === "dark" ? "border-white/10 bg-white/[0.03]" : "border-[var(--line)] bg-black/[0.015]"
            }`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Toasts --------------------------------- */

export type ToastKind = "success" | "error" | "warning" | "info";
export interface ToastItem {
  id: string;
  message: string;
  kind: ToastKind;
}

const toastIcons: Record<ToastKind, IconName> = {
  success: "check",
  error: "x",
  warning: "alert",
  info: "info",
};

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((current) => [...current.slice(-3), { id, message, kind }]);
      window.setTimeout(() => remove(id), 4600);
    },
    [remove]
  );

  return { toasts, push, remove };
}

export function ToastViewport({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[120] flex w-[min(94vw,430px)] -translate-x-1/2 flex-col gap-2 sm:left-auto sm:right-5 sm:translate-x-0">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind} pointer-events-auto`}>
          <span className="toast-icon">
            <Icon name={toastIcons[toast.kind]} size={15} strokeWidth={2.1} />
          </span>
          <p className="flex-1 text-[14.5px] font-medium leading-snug">{toast.message}</p>
          <button onClick={() => onClose(toast.id)} className="opacity-50 transition hover:opacity-100" aria-label="Cerrar aviso">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Score ring ------------------------------- */

export function ScoreRing({
  value,
  max = 100,
  size = 128,
  stroke = 9,
  label = "Puntaje",
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, value / max));
  const color = pct >= 0.7 ? "#0f766e" : pct >= 0.5 ? "#d97706" : "#be123c";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-[var(--line)]" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[29.5px] font-bold leading-none tracking-[-0.04em]" style={{ color }}>
          {value}
        </span>
        <span className="mt-1 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[var(--ink)]/62">{label}</span>
      </div>
    </div>
  );
}

/* -------------------------------- utilities ------------------------------- */

export function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return <p className={`eyebrow ${tone === "dark" ? "eyebrow-dark" : ""}`}>{children}</p>;
}

export function SecurityChip({ icon, children, className = "" }: { icon: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={`security-chip ${className}`}>
      <Icon name={icon} size={11} strokeWidth={2} />
      {children}
    </span>
  );
}

export function EmptyState({
  icon = "search",
  title,
  text,
  action,
}: {
  icon?: IconName;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--mist)] text-[var(--teal)]">
        <Icon name={icon} size={22} />
      </div>
      <p className="font-display text-sm font-semibold">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-[var(--ink)]/68">{text}</p>
      {action}
    </div>
  );
}

export function LiveDot({ tone = "active" }: { tone?: "active" | "warn" | "idle" }) {
  const colors = {
    active: "bg-[var(--lime)] shadow-[0_0_0_3px_rgba(198,242,78,.16)]",
    warn: "bg-[var(--amber)] shadow-[0_0_0_3px_rgba(246,183,86,.16)]",
    idle: "bg-white/30",
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${colors[tone]}`} />;
}
