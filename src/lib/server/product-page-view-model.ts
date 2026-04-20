import type { getProductBundle } from "@/lib/server/services";

type ProductBundle = Awaited<ReturnType<typeof getProductBundle>>;

export function buildProductPageViewModel(bundle: ProductBundle) {
  return {
    defaultTemplateId: bundle.product.templateId ?? bundle.availableTemplates[0]?.id ?? "",
    gcpSummary: bundle.opsHealth.providers.find((provider) => provider.provider === "gcp"),
    githubSummary: bundle.opsHealth.providers.find((provider) => provider.provider === "github"),
    isArchived: bundle.workflowLocked,
    latestRevenue: [...bundle.revenueSnapshots].sort((a, b) => b.syncedAt.localeCompare(a.syncedAt))[0],
    leadOptions: bundle.leads.map((lead) => ({
      id: lead.id,
      label: `${lead.name} / ${lead.company}`,
    })),
    targetReleaseDateValue: bundle.buildSheet.targetReleaseAt?.slice(0, 10) ?? "",
    touchpointsByLead: new Map(
      bundle.leads.map((lead) => [
        lead.id,
        bundle.touchpoints.filter((touchpoint) => touchpoint.leadId === lead.id),
      ]),
    ),
  };
}
