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
        <div
          key={event.id}
          className="rounded-[1.35rem] border border-white/10 bg-slate-950/55 p-5"
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
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              {formatDateTime(event.createdAt)}
            </p>
          </div>
          <p className="mt-4 text-lg font-semibold text-white">{event.title}</p>
          <p className="mt-2 text-sm leading-7 text-slate-300">{event.detail}</p>
          {showProductLink && event.product ? (
            <Link
              href={`/app/products/${event.product.id}`}
              className="mt-4 inline-flex text-sm text-cyan-200 underline underline-offset-4"
            >
              Open {event.product.name}
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
