# Onboarding Contract v1 - Launch Readiness

## Scope

This contract formalizes the checked-in readiness inputs that gate the public onboarding and billing flow.
It documents the same expectations enforced by runtime readiness code and operator tooling.

## Readiness Outputs

Source of truth:
- `src/lib/server/runtime-config.ts`
- `src/app/api/healthz/route.ts`

Published readiness fields:
- `pricingReady`
- `signupIntentReady`
- `selfServeReady`
- `checkoutReady`
- `automationReady`
- `guidance.summary`
- `guidance.nextStep`
- `guidance.repoControlledIssues`
- `guidance.externalVerification`

## Self-Serve Ready

Self-serve is ready only when:
- at least one visible public plan exists
- Firebase client configuration exists
- Firebase admin configuration exists
- the runtime readiness layer resolves Firebase as ready

## Checkout Ready

Checkout is ready only when:
- at least one visible public plan exists
- `STRIPE_PLATFORM_SECRET_KEY` is configured
- `STRIPE_PLATFORM_WEBHOOK_SECRET` is configured
- `MICROSAAS_FACTORY_APP_URL` is configured
- `STRIPE_PLATFORM_PRICE_MAP_JSON` parses successfully
- each visible public plan has monthly and annual Stripe price IDs

## Full Launch Target

Operator target posture:
- `platformBillingEnabled = true`
- `publicSignupEnabled = true`
- `selfServeProvisioningEnabled = true`
- `checkoutEnabled = true`

## Guidance Semantics

- `guidance.summary` is the shared public-safe launch summary used by founder, public, and operator surfaces.
- `guidance.nextStep` is the next rollout move after the current build is deployed.
- `guidance.repoControlledIssues` lists remaining repo/runtime work such as Firebase, Stripe, pricing, signup, or automation gaps.
- `guidance.externalVerification` lists the manual public-edge, checkout, and DNS checks that remain outside the repository.

## Manual Handoff Requirements

The repository implementation alone does not complete launch.
Human-executed rollout still must:
- provision Firebase project/client/admin credentials
- provision Stripe live secret, webhook secret, and price IDs
- apply Cloud Run runtime configuration
- verify `https://microsaasfactory.io/api/healthz`
- review `guidance.summary` and `guidance.repoControlledIssues`
- verify apex HTTP redirects to HTTPS with `301`
- verify SPF, DKIM, DMARC, and CAA posture

## Non-Goals

- This contract does not define a training workflow.
- This contract does not declare a model registry or dataset promotion flow.
- This contract does not authorize persisted schema expansion on its own.
