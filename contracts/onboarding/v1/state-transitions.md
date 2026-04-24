# Onboarding Contract v1 - State Transitions

## Scope

This contract defines the allowed onboarding transitions for public signup, invite conversion, Firebase session exchange, and founder re-entry.
It matches the existing repository implementation and does not introduce new persisted states.

## Public Entry Modes

Supported public entry paths:
1. `/signup` for self-serve workspace staging
2. `/login` for founder re-entry and invite-token fallback
3. `/waitlist` for secondary beta intake
4. `/pricing` for plan comparison and checkout entry when eligible

## SignupIntent Lifecycle

1. Create signup intent
- Trigger: public signup form submission
- Input: founder name, founder email, workspace name, plan ID
- Result: `SignupIntent.status = pending_activation`

2. Convert to invite
- Trigger: operator action from admin queue
- Result: `SignupIntent.status = invited`
- Result: invite record exists for the same founder email and workspace

3. Self-serve activation
- Trigger: Firebase session exchange with `signupIntentId`
- Preconditions:
  - public signup enabled
  - self-serve provisioning enabled
  - Firebase client and admin readiness available
- Result:
  - workspace/user created or reopened
  - founder session created
  - `SignupIntent.status = provisioned`

4. Billing follow-up
- Trigger: checkout or billing workflow after provisioning
- Result: `SignupIntent.status` may move to `payment_pending` when the workspace exists but billing is still incomplete

## Invite Lifecycle

1. Operator issues invite
2. Founder opens `/invite/[token]`
3. Founder completes invite activation through invite-token or Firebase exchange
4. Founder session is created
5. Invite gets `acceptedAt`

## Founder Re-Entry

Supported return paths:
- invite email + token from `/login`
- Firebase Google sign-in from `/login`
- Firebase email-link sign-in from `/login`

Contract notes:
- Firebase is the primary fast return path whenever it is configured and ready for provisioned founders.
- Invite-token login remains valid after self-serve launch.
- Duplicate public signup for an existing founder email must redirect the user toward `/login` instead of reprovisioning a second workspace.

## Checkout Entry

Checkout may start only when all of the following are true:
- `platformBillingEnabled = true`
- `checkoutEnabled = true`
- runtime readiness reports checkout ready
- founder workspace subscription state is eligible for checkout

Supported pricing return states:
- `billing=success`
- `billing=cancelled`
- `billing=error`
