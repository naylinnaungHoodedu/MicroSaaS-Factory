---
version: 1.0.0
last_reviewed: 2026-04-22
owners:
  - "Nay Linn Aung <na27@hood.edu>"
scope:
  - "/contracts/onboarding/**"
  - "Nearest nested AGENTS.md wins within this subtree"
---

## 1. Purpose

1.1 MUST treat this subtree as the controlled source of truth for onboarding contracts only.
1.2 MUST keep this subtree documentation-only; it does not authorize new persisted fields by itself.
1.3 MUST keep the repo posture inference-only. This subtree is not a training, registry, or dataset pipeline.

## 2. Required Files

2.1 MUST keep `MODEL_CARD.md` and `DATASET_CARD.md` present even though no in-repo training system exists today.
2.2 MUST version onboarding contract docs under `v1/` until a newer version is added intentionally.
2.3 MUST update all affected onboarding contract docs together when changing:
- `SignupIntent`
- invite activation
- founder session or Firebase exchange behavior
- public funnel state
- launch-readiness expectations

## 3. Change Rules

3.1 MUST keep examples free of secrets, live credentials, and real user data.
3.2 MUST keep wire shapes, state names, and readiness expectations aligned with checked-in TypeScript types and tests.
3.3 MUST update repository tests and both root activity logs in the same change when contract behavior changes.

## 4. Boundaries

4.1 MUST NOT treat `MODEL_CARD.md` or `DATASET_CARD.md` as evidence of an active ML training workflow.
4.2 MUST stop and ask before using this subtree to justify schema expansion that is not implemented and tested in the same change.
