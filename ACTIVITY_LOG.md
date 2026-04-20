# MicroSaaS Factory — Activity Log

> **Session date**: April 20, 2026  
> **Session window**: 01:14 AM – 02:03 AM EDT  
> **Engineer**: Antigravity AI Assistant  
> **Platform**: MicroSaaS Factory v0.1.0 (Next.js 16.2.3 / React 19 / Firebase / Firestore)

---

## Table of Contents

1. [Phase 1 — Deep Codebase Audit](#phase-1--deep-codebase-audit)
2. [Phase 2 — Bug Identification & Remediation](#phase-2--bug-identification--remediation)
3. [Phase 3 — End-to-End Functional Verification](#phase-3--end-to-end-functional-verification)
4. [Phase 4 — Verification Results](#phase-4--verification-results)
5. [Files Modified](#files-modified)
6. [Files Created](#files-created)
7. [Database State After Testing](#database-state-after-testing)
8. [Platform Activity Timeline](#platform-activity-timeline)
9. [Remaining Production Recommendations](#remaining-production-recommendations)

---

## Phase 1 — Deep Codebase Audit

### 1.1 Architecture Review

Performed a comprehensive review of the entire application architecture:

| Component | Files Audited | Lines Reviewed | Status |
|-----------|--------------|----------------|--------|
| Server services layer | `src/lib/server/services.ts` | 4,487 lines | ✅ Audited |
| Database abstraction | `src/lib/server/db.ts` | 341 lines | ✅ Audited |
| Authentication system | `src/lib/server/auth.ts`, `auth-mode.ts` | 183 lines | ✅ Audited |
| Firebase admin SDK | `src/lib/server/firebase-admin.ts` | 131 lines | ✅ Audited |
| Firebase client config | `src/lib/firebase/client.ts`, `config.ts`, `session.ts` | 87 lines | ✅ Audited |
| Cryptographic utilities | `src/lib/server/crypto.ts` | 62 lines | ✅ Audited |
| AI generation layer | `src/lib/server/ai.ts` | 124 lines | ✅ Audited |
| Integration sync layer | `src/lib/server/integrations.ts` | 455 lines | ✅ Audited |
| Ops health summarizer | `src/lib/server/ops-health.ts` | 620 lines | ✅ Audited |
| Server actions | `src/lib/server/actions.ts` | 665 lines | ✅ Audited |
| Domain types | `src/lib/types.ts` | 624 lines | ✅ Audited |
| Constants & templates | `src/lib/constants.ts`, `src/lib/templates.ts` | 455 lines | ✅ Audited |
| Utilities | `src/lib/utils.ts` | 74 lines | ✅ Audited |
| Firebase login panel | `src/components/firebase-login-panel.tsx` | 359 lines | ✅ Audited |
| App navigation | `src/components/ui/AppNav` | Referenced | ✅ Audited |

### 1.2 Route & Page Review

| Route | File | Status |
|-------|------|--------|
| `/` (Homepage) | `src/app/page.tsx` | ✅ Audited |
| `/login` | `src/app/login/page.tsx` | ✅ Audited |
| `/signup` | `src/app/signup/page.tsx` | ✅ Audited |
| `/waitlist` | `src/app/waitlist/page.tsx` | ✅ Audited |
| `/pricing` | `src/app/pricing/page.tsx` | ✅ Audited |
| `/invite/[token]` | `src/app/invite/[token]/page.tsx` | ✅ Audited |
| `/admin` | `src/app/admin/page.tsx` | ✅ Audited |
| `/app` (Dashboard) | `src/app/app/page.tsx` | ✅ Audited |
| `/app/crm` | `src/app/app/crm/page.tsx` | ✅ Audited |
| `/app/products/[id]` | `src/app/app/products/[productId]/[[...section]]/page.tsx` | ✅ Audited |
| `/app` layout | `src/app/app/layout.tsx` | ✅ Audited |
| API: Firebase session | `src/app/api/auth/firebase/session/route.ts` | ✅ Audited |

### 1.3 Automated Verification

| Check | Command | Result |
|-------|---------|--------|
| Unit tests | `npm test` (vitest) | **97/97 tests passing** across 17 test files |
| Production build | `npm run build` (Next.js 16 Turbopack) | **Clean build** — 19 routes, 0 errors |
| TypeScript compilation | Included in build | **0 type errors** |
| Live site inspection | Browser visit to `microsaasfactory.io` | ✅ Accessible, SSL valid |

---

## Phase 2 — Bug Identification & Remediation

### 2.1 Bugs Found & Fixed

#### Bug 1 — Opportunity Competition Score Inversion
- **File**: `src/lib/server/services.ts` (line 386-390)
- **Severity**: Medium
- **Root cause**: The `scoreOpportunity` function assigned a score of **5** to novel markets (<4 competitors) and **6** to crowded markets (>12 competitors), which contradicted the risk narrative. Crowded markets should be penalized more than novel ones.
- **Fix applied**: Swapped scores — novel (<4) now gets **6**, crowded (>12) now gets **5**.
- **Impact**: Corrects opportunity ranking across all existing and future products.

```diff
- : input.competitionCount < 4
-   ? 5
-   : 6;
+ : input.competitionCount < 4
+   ? 6
+   : 5;
```

#### Bug 2 — CRM Task Overdue/DueToday Bucket Overlap
- **File**: `src/lib/server/services.ts` (line 579)
- **Severity**: Medium
- **Root cause**: `isTaskOverdue` used full ISO timestamp comparison (`Date.now()`), while `isTaskDueToday` used day-key comparison (`toDayKey`). A task due today at `T12:00:00Z` could appear in **both** the "Due Today" and "Overdue" buckets after that timestamp.
- **Fix applied**: Changed `isTaskOverdue` to use day-granularity comparison via `toDayKey()`, making buckets mutually exclusive.
- **Impact**: CRM dashboard task counts are now accurate; no double-counting.

```diff
- return new Date(task.dueAt).getTime() < Date.now();
+ return toDayKey(task.dueAt) < toDayKey(now());
```

#### Bug 3 — Missing `connection.secret` Guard in `sendOnboardingTestEmail`
- **File**: `src/lib/server/services.ts` (line 4198)
- **Severity**: Low
- **Root cause**: The function guarded against `!connection` but not `!connection.secret`. If a connection record existed without an encrypted secret (e.g., partial data migration), `decryptSecret(undefined)` would crash with a cryptic error.
- **Fix applied**: Tightened guard to `!connection?.secret`.
- **Impact**: Prevents runtime crash; shows clear "Resend is not connected" error instead.

```diff
- if (!connection || !sequence) {
+ if (!connection?.secret || !sequence) {
```

#### Bug 4 — Misleading Signup Intent Error Message
- **File**: `src/lib/server/services.ts` (line 1403)
- **Severity**: Low (cosmetic)
- **Root cause**: Error message said "Founder name, email, and workspace name are required" but `founderName` is automatically derived from the email prefix when not provided.
- **Fix applied**: Updated message to "Email and workspace name are required."
- **Impact**: Better developer/user experience; error message matches actual validation.

```diff
- throw new Error("Founder name, email, and workspace name are required.");
+ throw new Error("Email and workspace name are required.");
```

#### Bug 5 — Untyped `sendResendTestEmail` Return Value
- **File**: `src/lib/server/integrations.ts` (line 418)
- **Severity**: Low
- **Root cause**: `return response.json()` returned `Promise<any>`, leaking untyped data.
- **Fix applied**: Changed to `return (await response.json()) as { id: string }`.
- **Impact**: Improved type safety for callers of the email-send utility.

```diff
- return response.json();
+ return (await response.json()) as { id: string };
```

### 2.2 Post-Fix Verification

| Check | Result |
|-------|--------|
| `npm test` | **97/97 tests passing** ✅ |
| `npm run build` | **Clean build, 0 errors** ✅ |
| Regression risk | **Zero** — all changes are isolated to scoring math, comparison operators, guard conditions, error strings, and type annotations |

---

## Phase 3 — End-to-End Functional Verification

### 3.1 Test Environment Setup

| Setting | Value |
|---------|-------|
| Runtime | Next.js 16.2.3 (Turbopack) on `localhost:3000` |
| DB backend | Local JSON (`.local/microsaas-factory-db.json`) |
| Auth mode | Invite token only (Firebase not configured) |
| Admin key | `test-admin-key` |
| Automation key | `test-automation-key` |

### 3.2 Test Scenarios Executed

#### Authentication & Provisioning (5 tests)

| # | Scenario | Steps | Result |
|---|----------|-------|--------|
| 1 | **Homepage rendering** | Navigate to `/`, verify hero, nav links, feature badges | ✅ Pass |
| 2 | **Admin console — Issue invite** | Navigate to `/admin?key=test-admin-key`, fill invite form (email: `test@example.com`, workspace: "Test Workspace"), submit | ✅ Pass |
| 3 | **Invite acceptance page** | Navigate to `/invite/{token}`, verify email, workspace, expiry displayed | ✅ Pass |
| 4 | **Workspace activation** | Fill name "Test Founder", submit activation form, verify redirect to `/app` | ✅ Pass |
| 5 | **Login page** | Navigate to `/login`, verify email+token form, auth mode detection | ✅ Pass |

#### Product Lifecycle (5 tests)

| # | Scenario | Steps | Result |
|---|----------|-------|--------|
| 6 | **Create product** | Fill form with "OEE Dashboard" details, submit, verify in active products | ✅ Pass |
| 7 | **Research — Opportunity scoring** | Add "Alarm flood rationalization" opportunity with scores, verify X/50 total | ✅ Pass |
| 8 | **Validate — Lead logging** | Log "Jane Smith" from Acme Manufacturing, verify in lead ledger | ✅ Pass |
| 9 | **Spec — Save document** | Fill V1 features, exclusions, launch criteria, definition of done, submit | ✅ Pass |
| 10 | **Build — Build sheet** | Fill release goal, ship checklist (4 items), blockers, target date, submit | ✅ Pass |

#### Launch & Ops (3 tests)

| # | Scenario | Steps | Result |
|---|----------|-------|--------|
| 11 | **Launch — Metrics** | Save MRR ($0), churn (0%), P1 bugs (0), critical blockers (1) | ✅ Pass |
| 12 | **Launch — Gate evaluation** | Click "Evaluate launch gate", verify 1/7 checks passed (Spec ✅) | ✅ Pass |
| 13 | **CRM inbox** | Navigate to `/app/crm`, verify task buckets and CRM summary | ✅ Pass |

#### Admin & Lifecycle Management (4 tests)

| # | Scenario | Steps | Result |
|---|----------|-------|--------|
| 14 | **Waitlist submission** | Fill form at `/waitlist` with founder details, submit | ✅ Pass |
| 15 | **Product archive** | Archive "OEE Dashboard" with reason "Pivoting to different vertical" | ✅ Pass |
| 16 | **Product restore** | Click "Restore lane" on archived product, verify active state | ✅ Pass |
| 17 | **Admin — Run LiveOps** | Click "Run live ops" on admin console, verify success result | ✅ Pass |

---

## Phase 4 — Verification Results

### 4.1 Launch Gate Evaluation Results

| Check | Status | Detail |
|-------|--------|--------|
| Validation threshold | ❌ Pending | Need 9 more leads and 3 more enthusiastic yes signals |
| Spec completeness | ✅ Connected | One-page spec is complete and approved |
| GitHub connected | ❌ Pending | Connect the target repository |
| GCP deploy connected | ❌ Pending | Connect the Cloud Run service |
| Stripe connected | ❌ Pending | Connect the restricted Stripe key |
| Onboarding configured | ❌ Pending | Connect Resend and generate the onboarding sequence |
| No critical blockers | ❌ Pending | Resolve active blockers and clear all P1 bugs |

### 4.2 Feature Flag State

| Flag | Value | Notes |
|------|-------|-------|
| `inviteOnlyBeta` | `true` | Active — platform requires invite tokens |
| `publicWaitlist` | `true` | Active — waitlist form is accessible |
| `publicSignupEnabled` | `false` | Disabled — no self-serve signup |
| `selfServeProvisioningEnabled` | `false` | Disabled — requires admin invite |
| `checkoutEnabled` | `false` | Disabled — no payment checkout |
| `platformBillingEnabled` | `false` | Disabled — pricing page redirects to home |
| `proAiEnabled` | `false` | Disabled — AI uses Flash model only |

---

## Files Modified

| File | Changes | Lines Changed |
|------|---------|---------------|
| `src/lib/server/services.ts` | Bugs 1-4: score inversion, task bucket overlap, secret guard, error message | 4 locations |
| `src/lib/server/integrations.ts` | Bug 5: typed return value for `sendResendTestEmail` | 1 location |

## Files Created

| File | Purpose |
|------|---------|
| `.env.local` | Local development environment configuration (test-only keys, local JSON backend) |
| `.local/microsaas-factory-db.json` | Auto-generated local database with test data from E2E verification |

---

## Database State After Testing

### Entity Summary

| Entity | Count |
|--------|-------|
| Workspaces | 1 (`Test Workspace`) |
| Users (Founders) | 1 (`test@example.com` / "Test Founder") |
| Products | 1 (`OEE Dashboard` — stage: `spec`) |
| Invites | 1 (accepted: `test@example.com`) |
| Opportunities | 1 (`Alarm flood rationalization`) |
| Validation Leads | 1 (`Jane Smith` — Acme Manufacturing) |
| Validation Sessions | 0 |
| Validation Tasks | 0 |
| Specs | 1 (complete — 4 V1 features, 2 exclusions) |
| Build Sheets | 1 (4 ship checklist items, 1 blocker) |
| Launch Gate Results | 1 (1/7 checks passed) |
| Activity Events | 11 |
| Automation Runs | 1 (LiveOps — success) |
| Waitlist Requests | 2 |
| Signup Intents | 0 |

### Product: OEE Dashboard

| Field | Value |
|-------|-------|
| ID | `9c88878b-9edf-4637-9faa-93a4a309f6b8` |
| Stage | `spec` |
| Vertical | Manufacturing |
| Target User | Plant floor operations manager |
| Pricing Hypothesis | $149/month per plant |
| Created | 2026-04-20T05:34:34.834Z |
| Last Updated | 2026-04-20T05:57:29.531Z |

---

## Platform Activity Timeline

All events recorded during E2E verification, in chronological order:

| Timestamp (UTC) | Event | Description |
|-----------------|-------|-------------|
| `05:32:09` | `invite_created` | Admin issued invite to `test@example.com` for "Test Workspace" |
| `05:32:27` | `invite_accepted` | Founder activated workspace via token `d1d2d83...` |
| `05:34:34` | `product_created` | Created "OEE Dashboard" (Manufacturing / $149/month per plant) |
| `05:35:57` | `opportunity_created` | Added "Alarm flood rationalization" — SCADA operators at utilities |
| `05:37:04` | `validation_lead_created` | Logged lead "Jane Smith" — Plant Operations Manager at Acme Manufacturing |
| `05:37:49` | `spec_saved` | Saved product spec with 4 V1 features and 2 exclusions |
| `05:42:38` | `build_sheet_saved` | Saved build release controls — 4 ship steps, 1 blocker |
| `05:43:40` | `launch_state_updated` | Updated launch metrics (MRR: $0, Churn: 0%, P1 bugs: 0) |
| `05:43:53` | `launch_gate_evaluated` | Evaluated launch gate — 1/7 checks passed |
| `05:46:54` | `launch_state_updated` | Updated launch metrics |
| `05:46:59` | `launch_state_updated` | Updated launch metrics |
| `05:56:52` | `product_archived` | Archived "OEE Dashboard" — reason: "Pivoting to different vertical" |
| `05:57:29` | `product_restored` | Restored "OEE Dashboard" to active portfolio |
| `05:58:04` | `live_ops_automation` | LiveOps sweep completed — "No live ops automation work was due" |

---

## Remaining Production Recommendations

### Critical (Pre-Launch)

1. **Encryption Key** — Verify `MICROSAAS_FACTORY_ENCRYPTION_KEY` in production is NOT the default `change-me`. All integration secrets (GitHub PATs, Stripe keys, GCP service accounts) are encrypted with this key.

2. **Firestore Backend** — Ensure `MICROSAAS_FACTORY_DB_BACKEND=firestore` in production. The local JSON backend is not concurrent-safe and must not be used with multiple Cloud Run instances.

3. **Firebase Configuration** — Configure the full Firebase Auth suite (`NEXT_PUBLIC_FIREBASE_*` + `FIREBASE_SERVICE_ACCOUNT_*` env vars) before enabling self-serve signup.

### Recommended (Post-Launch)

4. **Feature Flag Transition** — When ready for public access:
   - Set `publicSignupEnabled: true` and `selfServeProvisioningEnabled: true`
   - Configure Stripe checkout for `checkoutEnabled: true` and `platformBillingEnabled: true`

5. **Automation Scheduling** — Set up Cloud Scheduler to hit the internal automation endpoints:
   - `POST /api/internal/jobs/validation-crm/run` — CRM sweep (recommended: every 4 hours)
   - `POST /api/internal/jobs/live-ops/run` — Integration refresh (recommended: every 6 hours)

6. **Monitoring** — Monitor `automationRuns` in Firestore for `status: "failed"` or `status: "partial"` entries.

---

*Generated by the Antigravity AI coding assistant on April 20, 2026.*

---

## April 20, 2026 Launch Hardening Addendum

This addendum records the completed implementation and production rollout work that followed the earlier audit snapshot.

### Application And Repository Work Completed

- Fixed the build-breaking runtime readiness work in `src/lib/server/runtime-config.ts` and `src/lib/server/runtime-config.test.ts`.
- Added type-safe Stripe price-map parsing and explicit production enforcement for `FIRESTORE_PROJECT_ID`.
- Added public-platform plan sorting by visible plans and ascending `monthlyPrice`.
- Added a narrow test-only bypass for the production boot assertion so the Playwright standalone production harness can run without weakening real production safety.
- Added admin-managed platform plan CRUD in the admin surface and server action layer.
- Enforced the rollout contract that platform plan IDs must match `STRIPE_PLATFORM_PRICE_MAP_JSON` keys whenever Stripe price-map config exists.
- Updated the Playwright seed runtime to include a visible public plan and matching price-map data so browser verification follows the same rollout order as production.
- Hardened the deployment and operations scripts in `scripts/` after real GCP execution exposed edge cases:
  - service-account existence and propagation checks
  - Cloud Run env-to-secret migration behavior
  - Cloud Scheduler job detection and header update flags
  - Monitoring metric existence checks
  - Cloud Build image-tag handling for manual `gcloud builds submit`

### Verification Completed

- `npm run lint`
- `npm test` - 112 passing tests
- `npx tsc --noEmit --pretty false`
- `npm run build`
- `npm run test:e2e` - 9 passing Playwright tests

### Production Rollout Completed

- Verified the live production target on April 20, 2026:
  - active GCP project and Cloud Run service hosting the public site
  - production Firestore database backing automation state
- Created the dedicated runtime service account for Cloud Run.
- Granted the minimum required runtime roles:
  - `roles/datastore.user`
  - `roles/secretmanager.secretAccessor`
- Migrated the existing live app secrets from plain Cloud Run env vars into Secret Manager-backed refs for:
  - admin access
  - encryption
  - internal automation
- Updated Cloud Run to use:
  - Firestore as the production data backend
  - explicit Firestore project and database env vars
  - the public app URL env var
  - secret-backed refs for the required runtime secrets
- Deployed the hardened application build to a new Cloud Run revision.
- Enabled Cloud Scheduler and created recurring validation CRM and live ops jobs.
- Created Monitoring resources:
  - automation-problem log metric
  - automation alert policy
  - operator notification channel

### Live Smoke Validation Completed

- Confirmed `https://microsaasfactory.io` responded with HTTP `200`.
- Successfully executed:
  - `POST /api/internal/jobs/validation-crm/run`
  - `POST /api/internal/jobs/live-ops/run`
- Confirmed Firestore automation history persisted successfully after both runs.
- Confirmed the latest persisted automation entries on April 20, 2026 completed successfully with the expected "no work due" summaries.

### Remaining External Inputs Before Public Self-Serve Enablement

- Firebase production envs still need to be supplied:
  - full `NEXT_PUBLIC_FIREBASE_*`
  - `FIREBASE_SERVICE_ACCOUNT_PROJECT_ID`
  - `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`
  - `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`
- Stripe production envs still need to be supplied:
  - `STRIPE_PLATFORM_SECRET_KEY`
  - `STRIPE_PLATFORM_WEBHOOK_SECRET`
  - `STRIPE_PLATFORM_PRICE_MAP_JSON`
- Real public pricing tiers still need to be entered through the new admin plan-management surface.
- Feature flags for public signup, self-serve provisioning, platform billing visibility, and checkout were intentionally not flipped yet because the required Firebase, Stripe, and plan inputs are not present in this workspace.

*Addendum logged on April 20, 2026 after repository verification and live production rollout execution.*

---

## April 20, 2026 Architecture And Funnel Refactor Addendum

This addendum records the completed implementation pass that followed the earlier rollout hardening work.

### Completed Architecture Refactor Work

- Split the server service surface into a facade plus domain-oriented modules without breaking existing import paths.
- Preserved `src/lib/server/services.ts` as the stable entrypoint while moving the prior implementation body into:
  - `src/lib/server/services-core.ts`
  - `src/lib/server/service-domains/activity.ts`
  - `src/lib/server/service-domains/admin.ts`
  - `src/lib/server/service-domains/automation.ts`
  - `src/lib/server/service-domains/billing.ts`
  - `src/lib/server/service-domains/integrations.ts`
  - `src/lib/server/service-domains/onboarding.ts`
  - `src/lib/server/service-domains/public.ts`
  - `src/lib/server/service-domains/workspace.ts`
- Kept current route paths, action names, and persisted database behavior unchanged during the split.

### Completed Public Funnel Unification Work

- Implemented a single public funnel state contract in:
  - `src/lib/server/funnel.ts`
- Centralized derivation of:
  - availability mode (`waitlist`, `signup_intent`, `self_serve`)
  - journey mode (`returning_founder` included)
  - pricing visibility
  - checkout visibility
  - activation readiness
  - primary and secondary CTA behavior
  - founder-session-aware funnel state
- Rewired the public surfaces to render from that shared contract:
  - `src/app/page.tsx`
  - `src/app/pricing/page.tsx`
  - `src/app/signup/page.tsx`
  - `src/app/login/page.tsx`
  - `src/app/waitlist/page.tsx`
- Removed the prior page-by-page drift where pricing, signup, waitlist, and login each interpreted environment readiness independently.

### Completed Public Experience Upgrade Work

- Added reusable public-surface presentation components in:
  - `src/components/public-ui.tsx`
- Introduced consistent hero, CTA, and journey-rail rendering across the public funnel.
- Improved public messaging so each surface now clearly communicates:
  - current access mode
  - next allowed step
  - activation readiness
  - relationship between signup, waitlist, pricing, and founder login

### Completed Founder And Operator UI Extraction Work

- Extracted dashboard presentation into:
  - `src/lib/server/dashboard-view-model.ts`
  - `src/components/dashboard-sections.tsx`
- Simplified `src/app/app/page.tsx` so the route now composes dedicated sections instead of carrying the full rendering body inline.
- Extracted admin presentation into:
  - `src/lib/server/admin-view-model.ts`
  - `src/components/admin-sections.tsx`
- Rebuilt `src/app/admin/page.tsx` as a route shell over dedicated admin sections and view-model generation.
- Added product-page extraction support in:
  - `src/lib/server/product-page-view-model.ts`
  - `src/components/product-page-shell.tsx`
- Reduced inline page-specific shell logic inside:
  - `src/app/app/products/[productId]/[[...section]]/page.tsx`

### Completed Regression Coverage Expansion

- Added or rewrote public-funnel regression coverage in:
  - `src/lib/server/funnel.test.ts`
  - `src/app/page.test.tsx`
  - `src/app/login/page.test.tsx`
  - `src/app/pricing/page.test.tsx`
  - `src/app/signup/page.test.tsx`
  - `src/app/waitlist/page.test.tsx`
- Expanded the test surface so the repository now verifies:
  - waitlist-only mode
  - signup-intent mode
  - self-serve-ready mode
  - pricing-visible / checkout-hidden mode
  - checkout-eligible founder state
  - returning-founder mode

### Verification Completed In This Session

- Confirmed successful execution of:
  - `npm test`
  - `npm run lint`
  - `npm run build`
- Confirmed the repository test suite now passes with:
  - `121` passing Vitest tests
- Confirmed lint passes with no reported ESLint failures.
- Confirmed the Next.js production build completes successfully after the refactor and funnel rewiring.

### Current Repository Status After This Update

- The current folder now contains:
  - a stable domain-split server service facade
  - a unified public funnel model
  - extracted dashboard and admin rendering sections
  - extracted product page shell and view-model support
  - expanded public-funnel regression coverage
- The application behavior remains compatible with the existing route surface while the internal code organization is materially cleaner and easier to extend.

*Addendum logged on April 20, 2026 after the architecture split, public funnel unification, UI extraction work, and verification pass.*

---

## April 20, 2026 Self-Serve Launch Readiness Hardening Addendum

This addendum records the completed launch-readiness hardening pass performed after the earlier architecture and funnel refactor work.

### Repository Implementation Completed

- Hardened the application-level HTTP response posture in:
  - `next.config.ts`
- Added:
  - `poweredByHeader: false`
  - baseline security headers for:
    - `Strict-Transport-Security`
    - `X-Content-Type-Options`
    - `X-Frame-Options`
    - `Referrer-Policy`
    - `Permissions-Policy`
    - `Cross-Origin-Opener-Policy`
  - an initial `Content-Security-Policy-Report-Only` policy covering the current Google/Firebase, Stripe, GitHub, and Resend integration surface

### Public Metadata And Discoverability Work Completed

- Added centralized public-site metadata helpers in:
  - `src/lib/site.ts`
  - `src/app/public-metadata.ts`
- Expanded `src/app/layout.tsx` to include:
  - `metadataBase`
  - canonical metadata
  - Open Graph metadata
  - Twitter card metadata
  - manifest and icon metadata
  - viewport theme color
  - SoftwareApplication JSON-LD
- Added metadata routes in:
  - `src/app/robots.ts`
  - `src/app/sitemap.ts`
  - `src/app/manifest.ts`
- Added branded launch assets in `public/`:
  - `og.png`
  - `icon-192.png`
  - `icon-512.png`
  - `apple-touch-icon.png`
- Added a branded not-found surface in:
  - `src/app/not-found.tsx`

### Public Funnel Cache And UX Hardening Completed

- Marked the public funnel routes as explicitly dynamic so public-flag flips do not sit behind stale prerender or CDN behavior:
  - `src/app/page.tsx`
  - `src/app/pricing/page.tsx`
  - `src/app/signup/page.tsx`
  - `src/app/login/page.tsx`
  - `src/app/waitlist/page.tsx`
- Added page-level metadata exports for those public routes so canonical/Open Graph/Twitter state is consistent across the landing, pricing, signup, login, and waitlist surfaces.
- Added practical autofill hints on founder-facing public forms:
  - founder email fields now advertise `autoComplete="email"`
  - founder name fields now advertise `autoComplete="name"`
  - workspace naming uses `autoComplete="organization"`
  - invite-token entry is explicitly set to `autoComplete="off"`

### Runtime Health And Auth Route Hardening Completed

- Added a reusable runtime health snapshot model in:
  - `src/lib/server/runtime-config.ts`
- Added:
  - `getRuntimeHealthSnapshot()`
  - typed runtime health payloads combining app URL, auth posture, storage backend, and readiness checks
- Added the external health endpoint in:
  - `src/app/api/healthz/route.ts`
- The health endpoint now:
  - returns JSON
  - sets `Cache-Control: no-store`
  - returns `200` when all readiness checks are ready
  - returns `503` when runtime remains degraded for self-serve rollout
- Hardened Firebase session route behavior in:
  - `src/app/api/auth/firebase/session/route.ts`
- Changed Firebase session route semantics so:
  - disabled Firebase returns `501 Not Implemented` with neutral copy
  - unsupported methods return JSON `405` with `Allow: POST`
  - the existing invite-scoped, self-serve, and login session flows remain intact

### Operator Console Readiness Visibility Completed

- Extended the admin surface in:
  - `src/components/admin-sections.tsx`
- Added operator-facing launch-readiness visibility for:
  - visible public plan count
  - Firebase readiness
  - Stripe checkout readiness
  - automation readiness
  - direct health endpoint access via `/api/healthz`

### Regression Coverage Expansion Completed

- Added or updated repository coverage for the launch-readiness pass in:
  - `next.config.test.ts`
  - `src/app/metadata-routes.test.ts`
  - `src/app/api/healthz/route.test.ts`
  - `src/app/api/auth/firebase/session/route.test.ts`
  - `src/app/page.test.tsx`
  - `src/app/pricing/page.test.tsx`
  - `src/app/signup/page.test.tsx`
  - `src/app/login/page.test.tsx`
  - `src/app/waitlist/page.test.tsx`
  - `e2e/public-signup.spec.ts`
- Expanded verification to cover:
  - new security-header config
  - robots / sitemap / manifest generation
  - health-endpoint success and degraded semantics
  - disabled-Firebase `501` handling
  - JSON `405` method handling on the Firebase session route
  - public-page metadata exports
  - Playwright stability after the public-route dynamic-behavior changes

### Verification Completed In This Session

- Confirmed successful local execution of:
  - `npm test`
  - `npm run lint`
  - `npm run build`
  - `npm run test:e2e`
- Confirmed the repository test surface now passes with:
  - `134` passing Vitest tests
  - `9` passing Playwright end-to-end tests
- Confirmed the production build now emits and serves:
  - `/robots.txt`
  - `/sitemap.xml`
  - `/manifest.webmanifest`
  - `/api/healthz`

### Production Deployment Completed

- Submitted and completed a new Cloud Build deployment using:
  - image tag `deploy-20260420-2`
- Confirmed the new production Cloud Run revision:
  - `microsaas-factory-00007-4t6`
- Confirmed the live site now serves the new revision and exposes:
  - security headers
  - no `X-Powered-By` header
  - no-store public redirects where appropriate
  - new health and metadata routes

### Live Verification Completed

- Confirmed `https://microsaasfactory.io` now returns:
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Cross-Origin-Opener-Policy`
  - `Content-Security-Policy-Report-Only`
- Confirmed:
  - `GET /api/auth/firebase/session` returns JSON `405`
  - `POST /api/auth/firebase/session` returns JSON `501` while Firebase remains intentionally unconfigured in production
  - `GET /api/healthz` returns JSON `503` with accurate degraded readiness details because self-serve dependencies are still incomplete
  - `GET /pricing` now redirects with no-store semantics instead of long-lived CDN cache semantics

### DNS And Platform Follow-Up Completed

- Verified the Cloud Run domain mapping for:
  - `microsaasfactory.io -> microsaas-factory`
- Added Cloud DNS CAA records in the `microsaasfactory-io` managed zone:
  - `0 issue "pki.goog"`
  - `0 issuewild "pki.goog"`
- Confirmed Cloud Scheduler jobs remain enabled for:
  - `microsaas-factory-validation-crm`
  - `microsaas-factory-live-ops`
- Confirmed the existing monitoring alert policy remains present for:
  - `MicroSaaS Factory automation problems`

### Remaining External Inputs Still Blocking Real Self-Serve Enablement

- Firebase production configuration is still not present on Cloud Run for:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - optional storage and messaging client fields
  - `FIREBASE_SERVICE_ACCOUNT_PROJECT_ID`
  - `FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL`
  - `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`
- Stripe production configuration is still not present on Cloud Run for:
  - `STRIPE_PLATFORM_SECRET_KEY`
  - `STRIPE_PLATFORM_WEBHOOK_SECRET`
  - `STRIPE_PLATFORM_PRICE_MAP_JSON`
- Public pricing is still not self-serve-ready because:
  - no visible production public plans exist in Firestore
  - checkout pricing IDs have not been populated for real plans
- DMARC / SPF / DKIM could not be safely created from this workspace because:
  - no real DMARC report mailbox was available for publication
  - no Resend-issued DNS values were available for the sending domain
- The apex HTTP to HTTPS hop still returns `302`, which appears to be controlled by the current Cloud Run/domain-mapping fronting path rather than by repository code.

### Current Folder Status After This Update

- The current folder now contains:
  - hardened response-header configuration
  - shared public metadata helpers
  - robots / sitemap / manifest route support
  - branded OG and PWA assets
  - branded not-found handling
  - a reusable runtime health model and external health endpoint
  - updated Firebase session-route semantics
  - expanded route, metadata, config, and browser regression coverage
- The live deployment now matches the repository for the completed launch-readiness code path.
- The remaining work to open real production self-serve is now narrowed to external credential, pricing, and DNS-email-auth inputs rather than missing application code.

*Addendum logged on April 20, 2026 after the self-serve launch-readiness implementation, verification pass, Cloud Build deployment, live production verification, and safe DNS follow-up work.*
