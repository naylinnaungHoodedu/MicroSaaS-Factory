import { formatDate } from "@/lib/utils";

const ARCHIVED_WORKFLOW_MESSAGE =
  "This lane is archived. Workflow forms are read-only until you restore it, but you can still review the full record and clone it into a new baseline.";

export function ArchivedProductBanner({
  archivedAt,
  archivedReason,
}: {
  archivedAt?: string;
  archivedReason?: string;
}) {
  return (
    <div className="rounded-[1.4rem] border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
      <p className="font-semibold uppercase tracking-[0.2em]">Archived lane</p>
      <p className="mt-2 leading-7">
        Archived {formatDate(archivedAt ?? new Date().toISOString())}.
        {archivedReason ? ` Reason: ${archivedReason}.` : ""}
      </p>
      <p className="mt-2 leading-7">{ARCHIVED_WORKFLOW_MESSAGE}</p>
    </div>
  );
}

export function WorkflowLockNotice() {
  return (
    <div className="rounded-[1.4rem] border border-amber-400/20 bg-amber-500/5 p-4 text-sm leading-7 text-amber-100">
      {ARCHIVED_WORKFLOW_MESSAGE}
    </div>
  );
}
