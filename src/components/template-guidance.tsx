import { Section } from "@/components/ui";
import type {
  ProductTemplate,
  ProductTemplateLaunchStage,
  ProductTemplateOpsStage,
  ProductTemplateResearchStage,
  ProductTemplateSpecStage,
  ProductTemplateValidateStage,
} from "@/lib/types";

function GuidanceList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        {title}
      </p>
      <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ProductTemplateBadge({
  template,
}: {
  template: ProductTemplate | null | undefined;
}) {
  if (!template) {
    return null;
  }

  return (
    <span className="inline-flex items-center rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
      {template.shortLabel}
    </span>
  );
}

function renderResearchGuidance(stage: ProductTemplateResearchStage) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Ideal customer profile
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-300">{stage.idealCustomerProfile}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Pricing band
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-300">{stage.pricingBand}</p>
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">Moat note</p>
        <p className="mt-2 text-sm leading-7 text-slate-300">{stage.moatNote}</p>
      </div>
      <GuidanceList title="Opportunity angles" items={stage.opportunityAngles} />
    </div>
  );
}

function renderValidateGuidance(stage: ProductTemplateValidateStage) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Target buyer
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-300">{stage.targetBuyer}</p>
      </div>
      <GuidanceList title="Recommended channels" items={stage.recommendedChannels} />
      <GuidanceList title="Qualification questions" items={stage.qualificationQuestions} />
      <GuidanceList title="Go signals" items={stage.goSignals} />
      <GuidanceList title="No-go signals" items={stage.noGoSignals} />
    </div>
  );
}

function renderSpecGuidance(stage: ProductTemplateSpecStage) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GuidanceList title="V1 features" items={stage.v1Features} />
      <GuidanceList title="Exclusions" items={stage.exclusions} />
      <GuidanceList title="Launch criteria" items={stage.launchCriteria} />
      <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          Definition of done frame
        </p>
        <p className="mt-4 text-sm leading-7 text-slate-300">{stage.definitionOfDone}</p>
      </div>
    </div>
  );
}

function renderOpsGuidance(stage: ProductTemplateOpsStage) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GuidanceList title="Recommended integrations" items={stage.recommendedIntegrations} />
      <GuidanceList title="Environment prerequisites" items={stage.environmentPrerequisites} />
      <GuidanceList title="Operational checks" items={stage.operationalChecks} />
    </div>
  );
}

function renderLaunchGuidance(stage: ProductTemplateLaunchStage) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GuidanceList title="Checklist starters" items={stage.checklistStarters} />
      <GuidanceList title="Success targets" items={stage.successTargets} />
    </div>
  );
}

export function TemplateGuidance({
  template,
  stage,
}: {
  template: ProductTemplate;
  stage: "research" | "validate" | "spec" | "ops" | "launch";
}) {
  return (
    <Section
      eyebrow="Template Guidance"
      title={`${template.label} guidance`}
      description={template.description}
    >
      {stage === "research" ? renderResearchGuidance(template.stages.research) : null}
      {stage === "validate" ? renderValidateGuidance(template.stages.validate) : null}
      {stage === "spec" ? renderSpecGuidance(template.stages.spec) : null}
      {stage === "ops" ? renderOpsGuidance(template.stages.ops) : null}
      {stage === "launch" ? renderLaunchGuidance(template.stages.launch) : null}
    </Section>
  );
}
