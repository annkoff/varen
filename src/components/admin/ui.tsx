import clsx from "clsx";
import type { LeadStatus } from "@prisma/client";

export function AdminHeader({ title, text, actions }: { title: string; text?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-[clamp(1.6rem,3vw,2.2rem)] font-light tracking-tight">{title}</h1>
        {text && <p className="mt-1 text-sm text-mute">{text}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, action }: { children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }) {
  return (
    <section className={clsx("min-w-0 border border-line bg-ink-2", className)}>
      {title && (
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="text-[11px] tracking-[0.18em] text-mute uppercase">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0 border border-line bg-ink-2 p-5">
      <p className="text-[11px] tracking-[0.16em] text-mute uppercase">{label}</p>
      <p className="mt-3 text-3xl font-light tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-dim">{hint}</p>}
    </div>
  );
}

const STATUS_STYLE: Record<LeadStatus, string> = {
  NEW: "border-sand/60 text-sand-2",
  IN_PROGRESS: "border-sky-400/50 text-sky-300",
  DONE: "border-ok/50 text-ok",
  CANCELLED: "border-line-strong text-dim",
};
const STATUS_TEXT: Record<LeadStatus, string> = { NEW: "Новая", IN_PROGRESS: "В работе", DONE: "Завершена", CANCELLED: "Отменена" };

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span className={clsx("inline-flex h-6 items-center whitespace-nowrap border px-2 text-[11px] tracking-wide", STATUS_STYLE[status])}>{STATUS_TEXT[status]}</span>;
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "ok" | "warn" | "err" }) {
  const cls = { default: "border-line-strong text-mute", ok: "border-ok/50 text-ok", warn: "border-sand/60 text-sand-2", err: "border-err/50 text-err" }[tone];
  return <span className={clsx("inline-flex h-6 items-center whitespace-nowrap border px-2 text-[11px]", cls)}>{children}</span>;
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[720px] border-collapse text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-normal [&_th]:tracking-[0.12em] [&_th]:text-mute [&_th]:uppercase [&_thead]:bg-ink-2">
        {children}
      </table>
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="border border-dashed border-line-strong px-6 py-14 text-center text-sm text-mute">{children}</div>;
}
