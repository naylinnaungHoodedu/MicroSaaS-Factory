# Onboarding Contract Model Card

## Purpose

This file exists to satisfy the repository governance requirement for `/contracts/**`.
It does not declare an in-repo model training, promotion, or registry workflow.

## Current Scope

- Governs onboarding contract documentation for public signup, invite activation, Firebase session exchange, and launch-readiness expectations.
- Does not define ML weights, training jobs, evaluation datasets, or registry stages.

## Active ML Posture

- Repository posture remains inference-only.
- `src/lib/server/ai.ts` is the only checked-in model integration boundary.
- No `/training/**` or `/models/**` workflow is introduced by this contract pack.

## Review Notes

- Keep onboarding contract changes synchronized with TypeScript types, route behavior, tests, and activity logs.
