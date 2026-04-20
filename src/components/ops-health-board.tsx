import { StatusPill } from "@/components/ui";
import type { ProductOpsHealthSummary } from "@/lib/types";

export function OpsHealthBoard({ summary }: { summary: ProductOpsHealthSummary }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            Ops coverage
          </p>
          <p className="text-xl font-semibold text-white">{summary.headline}</p>
          <p className="max-w-3xl text-sm text-slate-300">{summary.detail}</p>
        </div>
        <div className="space-y-3 text-right">
          <StatusPill status={summary.overallStatus} />
          <p className="text-sm text-slate-400">
            {summary.connectedCount}/{summary.totalCount} connected
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {summary.providers.map((provider) => (
          <article
            key={provider.provider}
            className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-sm text-slate-400">{provider.label}</p>
                <h3 className="text-lg font-semibold text-white">{provider.headline}</h3>
              </div>
              <StatusPill status={provider.status} />
            </div>

            <p className="mt-3 text-sm leading-7 text-slate-300">{provider.detail}</p>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              {provider.metrics.map((metric) => (
                <div key={`${provider.provider}-${metric.label}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">{metric.label}</dt>
                  <dd className="mt-2 text-sm font-medium text-slate-100">{metric.value}</dd>
                </div>
              ))}
            </dl>

            {provider.diagnostics.length > 0 || provider.rawSnapshot ? (
              <details className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-200">
                  Diagnostics
                </summary>
                {provider.diagnostics.length > 0 ? (
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {provider.diagnostics.map((metric) => (
                      <div key={`${provider.provider}-diagnostic-${metric.label}`}>
                        <dt className="text-xs uppercase tracking-[0.18em] text-slate-500">{metric.label}</dt>
                        <dd className="mt-1 break-all text-sm text-slate-300">{metric.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {provider.rawSnapshot ? (
                  <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs leading-6 text-slate-300">
                    {JSON.stringify(provider.rawSnapshot, null, 2)}
                  </pre>
                ) : null}
              </details>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
