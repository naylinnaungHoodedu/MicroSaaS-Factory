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
    <div className="rounded-[1.55rem] border border-amber-400/25 bg-amber-500/10 p-5 text-sm text-amber-100 shadow-lg shadow-black/10">
      <p className="eyebrow text-amber-100">Archived lane</p>
      <p className="mt-3 leading-7">
        Archived {formatDate(archivedAt ?? new Date().toISOString())}.
        {archivedReason ? ` Reason: ${archivedReason}.` : ""}
      </p>
      <p className="mt-2 leading-7">{ARCHIVED_WORKFLOW_MESSAGE}</p>
    </div>
  );
}

export function WorkflowLockNotice() {
  return (
    <div className="rounded-[1.45rem] border border-amber-400/20 bg-amber-500/5 p-4 text-sm leading-7 text-amber-100">
      {ARCHIVED_WORKFLOW_MESSAGE}
    </div>
  );
}
