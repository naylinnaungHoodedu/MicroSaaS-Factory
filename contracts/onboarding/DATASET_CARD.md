# Onboarding Contract Dataset Card

## Purpose

This file exists to satisfy the repository governance requirement for `/contracts/**`.
It does not declare an approved dataset pipeline.

## Current Scope

- Describes documentation inputs used to define onboarding contracts.
- The contract pack is derived from checked-in route behavior, runtime readiness rules, and UI flows.

## Non-Goals

- No train, validation, or test dataset is defined here.
- No protected-attribute, fairness-slice, or drift-monitoring dataset is introduced here.
- No production founder data should be copied into this subtree.

## Allowed Evidence Sources

- Checked-in TypeScript types and server logic
- Checked-in tests
- Checked-in environment and rollout documentation
- Public route behavior already implemented in the repository
