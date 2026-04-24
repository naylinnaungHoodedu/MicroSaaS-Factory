import Link from "next/link";
import type { ReactNode } from "react";

import { PRODUCT_STAGES, STAGE_LABELS } from "@/lib/constants";
import type { ConnectionStatus, ProductStage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Section({
  title,
  eyebrow,
  description,
  children,
  className,
  actions,
  contentClassName,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  actions?: ReactNode;
  contentClassName?: string;
}) {
  return (
    <section className={cn("section-shell overflow-hidden p-6 md:p-8", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          {eyebrow ? (
            <p className="eyebrow text-cyan-300/80">{eyebrow}</p>
          ) : null}
          <h2 className="max-w-4xl text-2xl font-semibold tracking-tight text-white md:text-[2rem]">
            {title}
          </h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-7 copy-soft md:text-[0.96rem]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <div className="surface-divider mt-6" />
      {children ? <div className={cn("mt-6", contentClassName)}>{children}</div> : null}
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "accent" | "success" | "warning";
}) {
  const toneClasses =
    tone === "accent"
      ? "border-cyan-300/24 bg-cyan-400/10"
      : tone === "success"
        ? "border-emerald-300/24 bg-emerald-500/10"
        : tone === "warning"
          ? "border-amber-300/24 bg-amber-500/10"
          : "border-white/10 bg-slate-950/70";

  return (
    <div
      className={cn(
        "surface-data rounded-[1.45rem] border p-5 shadow-lg shadow-black/10",
        toneClasses,
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm leading-6 copy-soft">{detail}</p> : null}
    </div>
  );
}

export function StatusPill({
  status,
}: {
  status: ConnectionStatus | "success" | "warning";
}) {
  const tone =
    status === "connected" || status === "success"
      ? "border-emerald-400/35 bg-emerald-500/12 text-emerald-100"
      : status === "error"
        ? "border-rose-400/35 bg-rose-500/12 text-rose-100"
        : status === "pending"
          ? "border-amber-400/35 bg-amber-500/12 text-amber-100"
          : "border-slate-500/35 bg-slate-500/12 text-slate-300";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]",
        tone,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function AppNav({
  productId,
  currentSection,
}: {
  productId: string;
  currentSection?: string;
}) {
  const items = [
    { href: `/app/products/${productId}`, label: "Overview", section: "" },
    { href: `/app/products/${productId}/research`, label: "Research", section: "research" },
    { href: `/app/products/${productId}/validate`, label: "Validate", section: "validate" },
    { href: `/app/products/${productId}/spec`, label: "Spec", section: "spec" },
    { href: `/app/products/${productId}/build`, label: "Build", section: "build" },
    { href: `/app/products/${productId}/ops`, label: "Ops", section: "ops" },
    { href: `/app/products/${productId}/launch`, label: "Launch", section: "launch" },
  ];

  return (
    <div className="surface-data sticky top-[6.75rem] z-20 -mx-1 overflow-hidden rounded-[1.55rem] border px-3 py-3 shadow-xl shadow-black/15 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between gap-3 px-2">
        <p className="eyebrow text-slate-500">Lane navigation</p>
        <p className="text-xs copy-soft">Move stage by stage without losing context.</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-1 pb-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2.5 text-sm font-medium transition",
              currentSection === item.section
                ? "border-cyan-300/55 bg-cyan-400/12 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/8 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function StageRail({ stage }: { stage: ProductStage }) {
  return (
    <div className="grid gap-3 md:grid-cols-6">
      {PRODUCT_STAGES.map((entry) => {
        const currentIndex = PRODUCT_STAGES.indexOf(stage);
        const entryIndex = PRODUCT_STAGES.indexOf(entry);
        const isActive = currentIndex >= entryIndex;
        const isCurrent = currentIndex === entryIndex;

        return (
          <div
            key={entry}
            aria-current={isCurrent ? "step" : undefined}
            data-current={isCurrent ? "true" : "false"}
            className={cn(
              "surface-data rounded-[1.35rem] border px-4 py-4 text-sm shadow-lg shadow-black/10",
              isActive
                ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-400",
            )}
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
              Step {entryIndex + 1}
            </p>
            <p className="mt-2 font-medium text-current">{STAGE_LABELS[entry]}</p>
            {isCurrent ? (
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-cyan-100">
                Current lane
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="surface-empty px-6 py-10 text-center shadow-inner shadow-black/10">
      <p className="text-lg font-medium text-white">{title}</p>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 copy-soft">{detail}</p>
    </div>
  );
}
