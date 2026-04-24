import Link from "next/link";

import { EmptyState } from "@/components/ui";
import { cn, formatDateTime, toTitleCase } from "@/lib/utils";

type ActivityFeedEvent = {
  id: string;
  category: string;
  source: "founder" | "ai" | "integration";
  title: string;
  detail: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
  } | null;
};

const SOURCE_LABELS: Record<ActivityFeedEvent["source"], string> = {
  founder: "Founder",
  ai: "AI",
  integration: "Integration",
};

const SOURCE_TONES: Record<ActivityFeedEvent["source"], string> = {
  founder: "border-amber-300/25 bg-amber-500/10 text-amber-100",
  ai: "border-cyan-300/25 bg-cyan-500/10 text-cyan-100",
  integration: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
};

export function ActivityFeed({
  events,
  emptyTitle,
  emptyDetail,
  showProductLink = false,
}: {
  events: ActivityFeedEvent[];
  emptyTitle: string;
  emptyDetail: string;
  showProductLink?: boolean;
}) {
  if (events.length === 0) {
    return <EmptyState title={emptyTitle} detail={emptyDetail} />;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <article
          key={event.id}
          className="surface-proof rounded-[1.6rem] p-5 shadow-lg shadow-black/10"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                {toTitleCase(event.category)}
              </span>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                  SOURCE_TONES[event.source],
                )}
              >
                {SOURCE_LABELS[event.source]}
              </span>
            </div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {formatDateTime(event.createdAt)}
            </p>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
            <div>
              <p className="text-xl font-semibold tracking-tight text-white">{event.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{event.detail}</p>
            </div>
            {showProductLink && event.product ? (
              <div className="surface-data rounded-[1.2rem] border p-4">
                <p className="eyebrow text-slate-500">Product lane</p>
                <p className="mt-3 text-sm text-white">{event.product.name}</p>
                <Link
                  href={`/app/products/${event.product.id}`}
                  className="mt-4 inline-flex text-sm text-cyan-200 underline underline-offset-4"
                >
                  Open {event.product.name}
                </Link>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
