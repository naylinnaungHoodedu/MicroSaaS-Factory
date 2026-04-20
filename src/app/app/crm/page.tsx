import { ValidationSessionList, ValidationTaskList } from "@/components/validation-crm";
import { Section, StatCard } from "@/components/ui";
import { requireFounderContext } from "@/lib/server/auth";
import { getWorkspaceCrmBundle } from "@/lib/server/services";

export default async function WorkspaceCrmPage() {
  const { workspace } = await requireFounderContext();
  const bundle = await getWorkspaceCrmBundle(workspace.id);

  return (
    <div className="space-y-8">
      <Section
        eyebrow="Founder CRM"
        title="Cross-product validation inbox"
        description="Track founder follow-ups, transcript intelligence, and recurring objections across every active product lane."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Due today"
            value={String(bundle.taskBuckets.dueToday.length)}
            detail="Tasks already ready for execution"
          />
          <StatCard
            label="Overdue"
            value={String(bundle.taskBuckets.overdue.length)}
            detail="Past-due founder follow-ups"
          />
          <StatCard
            label="Snoozed"
            value={String(bundle.taskBuckets.snoozed.length)}
            detail="Tasks parked for later"
          />
          <StatCard
            label="Pending analysis"
            value={String(bundle.pendingSessions.length)}
            detail="Queued or failed transcript analyses"
          />
        </div>
      </Section>

      <Section
        eyebrow="Due Today"
        title="Ready founder tasks"
        description="Tasks already due today across active product lanes."
      >
        <ValidationTaskList
          tasks={bundle.taskBuckets.dueToday}
          leads={bundle.leads}
          products={bundle.products}
          emptyTitle="No tasks due today"
          emptyDetail="Due founder tasks will appear here when work is ready."
        />
      </Section>

      <Section
        eyebrow="Overdue"
        title="Past-due follow-ups"
        description="Validation tasks that slipped past their intended due time."
      >
        <ValidationTaskList
          tasks={bundle.taskBuckets.overdue}
          leads={bundle.leads}
          products={bundle.products}
          emptyTitle="No overdue CRM tasks"
          emptyDetail="Past-due founder work will appear here when follow-ups miss their target date."
        />
      </Section>

      <Section
        eyebrow="Snoozed"
        title="Deferred follow-ups"
        description="Tasks that were intentionally pushed out of the current founder queue."
      >
        <ValidationTaskList
          tasks={bundle.taskBuckets.snoozed}
          leads={bundle.leads}
          products={bundle.products}
          emptyTitle="No snoozed tasks"
          emptyDetail="Snoozed tasks will reappear here until the next reminder sweep promotes them back to due."
        />
      </Section>

      <Section
        eyebrow="Pending Analysis"
        title="Queued transcript work"
        description="Validation sessions that still need analysis or a retry."
      >
        <ValidationSessionList
          sessions={bundle.pendingSessions}
          leads={bundle.leads}
          products={bundle.products}
          emptyTitle="No pending transcript analyses"
          emptyDetail="Queued or failed transcript analyses will appear here until the next sweep processes them."
        />
      </Section>

      <Section
        eyebrow="Transcripts"
        title="Recent validation sessions"
        description="Latest captured transcripts and extracted CRM intelligence across the workspace."
      >
        <ValidationSessionList
          sessions={bundle.recentSessions}
          leads={bundle.leads}
          products={bundle.products}
          emptyTitle="No validation sessions yet"
          emptyDetail="Upload or paste transcripts inside a product validation lane to start building CRM intelligence."
        />
      </Section>

      <Section
        eyebrow="Patterns"
        title="Top objections and pain points"
        description="The CRM aggregates repeated friction themes so founders can sharpen positioning and follow-up."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Top objections</p>
            <div className="mt-4 space-y-3">
              {bundle.topObjections.length > 0 ? (
                bundle.topObjections.map((item) => (
                  <div
                    key={`objection-${item.label}`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
                  >
                    {item.label} ({item.count})
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No objection clusters yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Top pain points</p>
            <div className="mt-4 space-y-3">
              {bundle.topPainPoints.length > 0 ? (
                bundle.topPainPoints.map((item) => (
                  <div
                    key={`pain-${item.label}`}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200"
                  >
                    {item.label} ({item.count})
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No pain-point clusters yet.</p>
              )}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
