import Link from "next/link";

import { EmptyState } from "@/components/ui";
import { updateValidationTaskStateAction } from "@/lib/server/actions";
import type {
  Product,
  ValidationLead,
  ValidationSession,
  ValidationTask,
} from "@/lib/types";
import { cn, formatDate, formatDateTime, toTitleCase } from "@/lib/utils";

function taskStateTone(state: ValidationTask["state"]) {
  if (state === "done") {
    return "border-emerald-300/25 bg-emerald-500/10 text-emerald-100";
  }

  if (state === "canceled") {
    return "border-rose-300/25 bg-rose-500/10 text-rose-100";
  }

  if (state === "snoozed") {
    return "border-amber-300/25 bg-amber-500/10 text-amber-100";
  }

  if (state === "due") {
    return "border-cyan-300/25 bg-cyan-500/10 text-cyan-100";
  }

  return "border-white/10 bg-white/5 text-slate-300";
}

function sessionStateTone(state: ValidationSession["analysisStatus"]) {
  if (state === "completed") {
    return "border-emerald-300/25 bg-emerald-500/10 text-emerald-100";
  }

  if (state === "failed") {
    return "border-rose-300/25 bg-rose-500/10 text-rose-100";
  }

  if (state === "processing") {
    return "border-cyan-300/25 bg-cyan-500/10 text-cyan-100";
  }

  return "border-amber-300/25 bg-amber-500/10 text-amber-100";
}

export function ValidationTaskList({
  tasks,
  leads,
  products,
  emptyTitle,
  emptyDetail,
}: {
  tasks: ValidationTask[];
  leads: ValidationLead[];
  products?: Array<Pick<Product, "id" | "name">>;
  emptyTitle: string;
  emptyDetail: string;
}) {
  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} detail={emptyDetail} />;
  }

  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
  const productsById = new Map((products ?? []).map((product) => [product.id, product]));

  return (
    <div className="space-y-4">
      {tasks.map((task) => {
        const lead = task.leadId ? leadsById.get(task.leadId) : null;
        const product = productsById.get(task.productId);

        return (
          <article
            key={task.id}
            className="surface-proof rounded-[1.6rem] p-5 shadow-lg shadow-black/10"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                      taskStateTone(task.state),
                    )}
                  >
                    {toTitleCase(task.state)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {toTitleCase(task.type)}
                  </span>
                  {product ? (
                    <Link
                      href={`/app/products/${product.id}/validate`}
                      className="text-xs uppercase tracking-[0.18em] text-cyan-200 underline underline-offset-4"
                    >
                      {product.name}
                    </Link>
                  ) : null}
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-white">{task.title}</h3>
                <p className="text-sm leading-7 text-slate-300">
                  {task.notes || "No task notes recorded."}
                </p>
              </div>
              <div className="surface-data space-y-2 rounded-[1.2rem] border px-4 py-3 text-right text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <p>Due {formatDate(task.dueAt)}</p>
                <p>Updated {formatDateTime(task.updatedAt)}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-400">
              {lead ? <p>Lead: {lead.name}</p> : null}
              {task.snoozedUntil ? <p>Snoozed until {formatDate(task.snoozedUntil)}</p> : null}
              {task.lastReminderSentAt ? (
                <p>Last reminder {formatDateTime(task.lastReminderSentAt)}</p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {task.state !== "done" ? (
                <form action={updateValidationTaskStateAction.bind(null, task.id)}>
                  <input type="hidden" name="action" value="complete" />
                  <button type="submit" className="button-secondary">
                    Complete
                  </button>
                </form>
              ) : null}
              {task.state !== "snoozed" && task.state !== "done" && task.state !== "canceled" ? (
                <form action={updateValidationTaskStateAction.bind(null, task.id)}>
                  <input type="hidden" name="action" value="snooze" />
                  <button type="submit" className="button-secondary">
                    Snooze
                  </button>
                </form>
              ) : null}
              {task.state !== "canceled" && task.state !== "done" ? (
                <form action={updateValidationTaskStateAction.bind(null, task.id)}>
                  <input type="hidden" name="action" value="cancel" />
                  <button type="submit" className="button-secondary">
                    Cancel
                  </button>
                </form>
              ) : null}
              {(task.state === "snoozed" || task.state === "done" || task.state === "canceled") ? (
                <form action={updateValidationTaskStateAction.bind(null, task.id)}>
                  <input type="hidden" name="action" value="reopen" />
                  <button type="submit" className="button-secondary">
                    Reopen
                  </button>
                </form>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function ValidationSessionList({
  sessions,
  leads,
  products,
  emptyTitle,
  emptyDetail,
}: {
  sessions: ValidationSession[];
  leads: ValidationLead[];
  products?: Array<Pick<Product, "id" | "name">>;
  emptyTitle: string;
  emptyDetail: string;
}) {
  if (sessions.length === 0) {
    return <EmptyState title={emptyTitle} detail={emptyDetail} />;
  }

  const leadsById = new Map(leads.map((lead) => [lead.id, lead]));
  const productsById = new Map((products ?? []).map((product) => [product.id, product]));

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const lead = session.leadId ? leadsById.get(session.leadId) : null;
        const product = productsById.get(session.productId);

        return (
          <article
            key={session.id}
            className="surface-proof rounded-[1.6rem] p-5 shadow-lg shadow-black/10"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                      sessionStateTone(session.analysisStatus),
                    )}
                  >
                    {toTitleCase(session.analysisStatus)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {toTitleCase(session.channel)}
                  </span>
                  {product ? (
                    <Link
                      href={`/app/products/${product.id}/validate`}
                      className="text-xs uppercase tracking-[0.18em] text-cyan-200 underline underline-offset-4"
                    >
                      {product.name}
                    </Link>
                  ) : null}
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-white">
                  {session.context || "Validation transcript"}
                </h3>
                <p className="text-sm text-slate-400">
                  {lead ? `${lead.name} / ` : ""}
                  {toTitleCase(session.sourceMode)} transcript captured {formatDateTime(session.createdAt)}
                </p>
              </div>
              <div className="surface-data space-y-2 rounded-[1.2rem] border px-4 py-3 text-right text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <p>Attempts {session.analysisAttempts}</p>
                <p>Analyzed {formatDateTime(session.lastAnalyzedAt)}</p>
              </div>
            </div>

            <p className="surface-data mt-4 max-h-40 overflow-hidden whitespace-pre-wrap rounded-[1.2rem] border px-4 py-4 text-sm leading-7 text-slate-300">
              {session.transcriptText}
            </p>

            {session.upload ? (
              <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Upload: {session.upload.fileName} / {session.upload.contentType}
              </p>
            ) : null}

            {session.analysis ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="surface-data rounded-[1.35rem] border p-4">
                  <p className="eyebrow text-slate-500">Summary</p>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {session.analysis.summary}
                  </p>
                  <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    Sentiment / stage
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {toTitleCase(session.analysis.sentiment)} /{" "}
                    {toTitleCase(session.analysis.stageAssessment)}
                  </p>
                </div>
                <div className="grid gap-4">
                  {(
                    [
                      { title: "Objections", items: session.analysis.objections },
                      { title: "Pain points", items: session.analysis.painPoints },
                      { title: "Buying signals", items: session.analysis.buyingSignals },
                      {
                        title: "Recommended next actions",
                        items: session.analysis.recommendedNextActions,
                      },
                    ] as Array<{ title: string; items: string[] }>
                  ).map(({ title, items }) => (
                    <div
                      key={title}
                      className="surface-data rounded-[1.3rem] border p-4"
                    >
                      <p className="eyebrow text-slate-500">{title}</p>
                      <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-300">
                        {items.length > 0 ? (
                          items.map((item) => <li key={item}>{item}</li>)
                        ) : (
                          <li>No items extracted.</li>
                        )}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {session.analysisStatus === "failed" && session.lastAnalysisError ? (
              <p className="mt-4 text-sm text-rose-200">{session.lastAnalysisError}</p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
