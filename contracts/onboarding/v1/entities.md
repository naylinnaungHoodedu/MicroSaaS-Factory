# Onboarding Contract v1 - Entities

## Scope

This contract version defines the checked-in onboarding entities used by the public funnel and founder-access flow.
It formalizes current repository behavior without adding persisted fields.

## SignupIntent

Source of truth:
- `src/lib/types.ts`
- `src/lib/server/public-actions.ts`
- `src/lib/server/services-core.ts`

Required fields:
- `id`
- `founderName`
- `email`
- `workspaceName`
- `planId`
- `createdAt`
- `status`

Optional fields:
- `workspaceId`
- `userId`
- `activatedAt`

Allowed statuses:
- `pending_activation`
- `invited`
- `provisioned`
- `payment_pending`

Contract notes:
- `pending_activation` is the default public-self-serve staging state after signup intent creation.
- `invited` means an operator converted the intent into an invite-led activation.
- `provisioned` means a founder identity and workspace have been bound successfully.
- `payment_pending` is reserved for workspace state that is provisioned but still awaiting billing completion.

## Invite

Source of truth:
- `src/lib/types.ts`
- `src/lib/server/services-core.ts`

Required fields:
- `id`
- `token`
- `email`
- `workspaceName`
- `createdAt`
- `expiresAt`

Optional fields:
- `acceptedAt`

Contract notes:
- Invite-token access remains a supported fallback path even after self-serve launch.
- Invite URLs and token-based login must continue to work for recovery and manual provisioning flows.

## Founder Session

Source of truth:
- `src/lib/types.ts`
- `src/lib/server/auth.ts`
- `src/app/api/auth/firebase/session/route.ts`

Required fields:
- `id`
- `kind`
- `createdAt`
- `expiresAt`

Optional fields:
- `userId`

Contract notes:
- Founder sessions and admin sessions share the same persisted session shape.
- Founder sessions may originate from invite-token login or Firebase identity exchange.

## PublicFunnelState

Source of truth:
- `src/lib/server/funnel.ts`

Stable fields relied on by routes and tests:
- `availabilityMode`
- `activationReady`
- `checkoutVisible`
- `pricingVisible`
- `founder`
- `summary`
- `primaryAction`
- `secondaryAction`
- `pricingAction`
- `surfaces`
- `launch`

Contract notes:
- Route paths remain stable: `/`, `/pricing`, `/signup`, `/login`, `/waitlist`.
- When Firebase is available, the public login surface may emphasize Firebase as the primary fast path while still preserving invite-token recovery.
- Public-facing surfaces may change copy and layout, but not the route contract or feature-flag names.
