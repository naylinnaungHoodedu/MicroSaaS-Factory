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
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-[1.75rem] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10 backdrop-blur", className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {description ? <p className="max-w-3xl text-sm leading-7 text-slate-300">{description}</p> : null}
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-400">{detail}</p> : null}
    </div>
  );
}

export function StatusPill({ status }: { status: ConnectionStatus | "success" | "warning" }) {
  const tone =
    status === "connected" || status === "success"
      ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
      : status === "error"
        ? "border-rose-400/40 bg-rose-500/15 text-rose-200"
        : status === "pending"
          ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
          : "border-slate-500/40 bg-slate-500/10 text-slate-300";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]", tone)}>
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
    <nav className="flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition",
            currentSection === item.section
              ? "border-cyan-300/60 bg-cyan-400/10 text-cyan-100"
              : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
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
              "rounded-2xl border px-4 py-4 text-sm",
              isActive
                ? "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-400",
            )}
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
              Step {entryIndex + 1}
            </p>
            <p className="mt-2 font-medium">{STAGE_LABELS[entry]}</p>
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
    <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-slate-950/40 p-8 text-center">
      <p className="text-lg font-medium text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{detail}</p>
    </div>
  );
}
