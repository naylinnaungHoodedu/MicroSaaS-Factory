"use client";

import { useMemo, useState } from "react";

import { createProductAction } from "@/lib/server/actions";
import type { MoatType, ProductTemplate } from "@/lib/types";

type ProductFormState = {
  name: string;
  summary: string;
  vertical: string;
  targetUser: string;
  pricingHypothesis: string;
  coreProblem: string;
  chosenMoat: MoatType;
};

const BLANK_STATE: ProductFormState = {
  name: "",
  summary: "",
  vertical: "",
  targetUser: "",
  pricingHypothesis: "",
  coreProblem: "",
  chosenMoat: "domain-expertise",
};

function buildTemplateState(
  template: ProductTemplate | undefined,
  currentName: string,
): ProductFormState {
  if (!template) {
    return {
      ...BLANK_STATE,
      name: currentName,
    };
  }

  return {
    name: currentName,
    summary: template.defaults.summary,
    vertical: template.defaults.vertical,
    targetUser: template.defaults.targetUser,
    pricingHypothesis: template.defaults.pricingHypothesis,
    coreProblem: template.defaults.coreProblem,
    chosenMoat: template.defaults.chosenMoat,
  };
}

export function ProductTemplateComposer({
  templates,
}: {
  templates: ProductTemplate[];
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<ProductTemplate["id"] | "">("");
  const [formState, setFormState] = useState<ProductFormState>(BLANK_STATE);
  const templatesById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates],
  );
  const selectedTemplate = selectedTemplateId
    ? templatesById.get(selectedTemplateId)
    : undefined;

  return (
    <form action={createProductAction} className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5 rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-5">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Template</span>
            <select
              aria-label="Template"
              value={selectedTemplateId}
              onChange={(event) => {
                const nextTemplateId = event.target.value as ProductTemplate["id"] | "";
                setSelectedTemplateId(nextTemplateId);
                setFormState((current) =>
                  buildTemplateState(
                    nextTemplateId ? templatesById.get(nextTemplateId) : undefined,
                    current.name,
                  ),
                );
              }}
            >
              <option value="">Blank</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="templateId" value={selectedTemplateId} />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
            {selectedTemplate ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300/80">
                  {selectedTemplate.label}
                </p>
                <p className="mt-3">{selectedTemplate.description}</p>
                <p className="mt-3 text-slate-400">
                  Pricing band: {selectedTemplate.stages.research.pricingBand}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Blank product
                </p>
                <p className="mt-3">
                  Start from a generic product lane and define every field manually.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Product name</span>
            <input
              name="name"
              required
              value={formState.name}
              onChange={(event) =>
                setFormState((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Factory Insight Hub"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Vertical</span>
            <input
              name="vertical"
              required
              value={formState.vertical}
              onChange={(event) =>
                setFormState((current) => ({ ...current, vertical: event.target.value }))
              }
              placeholder="Industrial automation"
            />
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm text-slate-300">Summary</span>
            <textarea
              name="summary"
              rows={3}
              required
              value={formState.summary}
              onChange={(event) =>
                setFormState((current) => ({ ...current, summary: event.target.value }))
              }
              placeholder="One-line founder thesis for the product."
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Target user</span>
            <input
              name="targetUser"
              required
              value={formState.targetUser}
              onChange={(event) =>
                setFormState((current) => ({ ...current, targetUser: event.target.value }))
              }
              placeholder="Plant manager at a 50-500 employee manufacturer"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Pricing hypothesis</span>
            <input
              name="pricingHypothesis"
              required
              value={formState.pricingHypothesis}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  pricingHypothesis: event.target.value,
                }))
              }
              placeholder="$49-$149 per month"
            />
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm text-slate-300">Core problem</span>
            <textarea
              name="coreProblem"
              rows={3}
              required
              value={formState.coreProblem}
              onChange={(event) =>
                setFormState((current) => ({ ...current, coreProblem: event.target.value }))
              }
              placeholder="What painful manual workflow are you replacing?"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-slate-300">Primary moat</span>
            <select
              name="chosenMoat"
              value={formState.chosenMoat}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  chosenMoat: event.target.value as MoatType,
                }))
              }
            >
              <option value="domain-expertise">Domain expertise</option>
              <option value="workflow-specificity">Workflow specificity</option>
              <option value="platform-integration">Platform integration</option>
              <option value="data-gravity">Data gravity</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="button-primary">
              Create product
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
