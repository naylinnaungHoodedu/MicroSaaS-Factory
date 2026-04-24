# MicroSaaS Factory Commercial Launch Report

## Summary

This report tracks the execution of the full-public-launch completion wave for `microsaasfactory.io`.

It is intended to complement:

- `ACTIVITY_LOG.md`
- `DEVELOPMENT_ACTIVITY_LOG.md`

The report records launch-facing implementation, deployment evidence, production verification, external blockers, and the final launch posture.

Current launch posture after this execution:

- repo-side launch hardening is implemented and deployed
- Cloud Build now gates on lint, unit tests, production build, and Playwright E2E
- production scheduler and monitoring are configured
- authenticated automation routes execute successfully in production
- edge verification now passes HSTS, CSP, legal routes, health, SPF, DMARC, and CAA
- full public launch remains blocked by:
  - apex HTTP redirect still returning `302` instead of `301`
  - missing Firebase project/app bootstrap and production client/admin config
  - missing Stripe platform checkout secrets and price-map validation

## Execution Log

### Repo And Verification Baseline

- Current baseline includes the existing commercial-readiness hardening patch already present in the workspace.
- Additional launch-completion repo work implemented in this wave:
  - `scripts/verify-public-edge.ps1`
    - fixed false-negative CAA detection
    - added sender-host SPF lookup on both apex and `send.<domain>`
    - kept `/api/healthz`, legal routes, HSTS, and redirect posture checks intact
  - `scripts/cloud-ops-runbook.md`
    - aligned sender-domain verification guidance with the updated verifier
  - `cloudbuild.yaml`
    - hardened the Playwright E2E step for Cloud Build by:
      - increasing server startup tolerance
      - explicitly managing the E2E server process
      - binding `HOSTNAME=0.0.0.0`
      - aligning the CI temp database path with the existing Playwright helpers
  - `playwright.config.ts`
    - added `PLAYWRIGHT_SKIP_WEBSERVER` support so Cloud Build can manage the E2E server explicitly
    - aligned `HOSTNAME=0.0.0.0` with CI startup behavior

### Local Verification

Completed locally before and during rollout:

- `npm run lint` -> pass
- `npm test` -> pass (`153` tests)
- `npm run build` -> pass
- `npm run test:e2e` -> pass (`13` Playwright scenarios)
- `npm audit --audit-level=high` -> no High or Critical findings; `8` low-severity transitive findings remain
- `docker build -t microsaas-factory-local .` -> blocked by local Docker Desktop engine unavailability

### Production Runtime

- Deployment target: Cloud Run service `microsaas-factory`
- Region: `us-central1`
- Public domain: `https://microsaasfactory.io`
- Health endpoint: `https://microsaasfactory.io/api/healthz`
- Successful Cloud Build deployment:
  - build ID: `e046f0ea-cf5b-4bed-8596-4daf70629283`
  - image: `us-central1-docker.pkg.dev/naylinnaung/microsaas-factory/web:deploy-20260422-2`
  - image digest: `sha256:1cd70d0ed4b94c07e0e1103d42ad6df35b9e55baf5ea19ae9c9d7a25f9a6e73f`
  - status: `SUCCESS`
- Successful Cloud Run rollout:
  - revision: `microsaas-factory-00010-ggz`
  - service URL: `https://microsaas-factory-55f6mkphiq-uc.a.run.app`
  - traffic: `100%`
- Current production runtime envs confirmed on the service:
  - present:
    - `MICROSAAS_FACTORY_DB_BACKEND=firestore`
    - `FIRESTORE_PROJECT_ID=naylinnaung`
    - `FIRESTORE_DATABASE_ID=microsaas-factory-db`
    - `MICROSAAS_FACTORY_FIRESTORE_COLLECTION=microsaasFactoryState`
    - `MICROSAAS_FACTORY_APP_URL=https://microsaasfactory.io`
    - Secret Manager refs for admin access, encryption key, and automation key
  - still missing:
    - Firebase client config (`NEXT_PUBLIC_FIREBASE_*`)
    - Firebase admin config (`FIREBASE_SERVICE_ACCOUNT_*`) or an implemented ADC-backed fallback
    - `STRIPE_PLATFORM_SECRET_KEY`
    - `STRIPE_PLATFORM_WEBHOOK_SECRET`
    - validated production `STRIPE_PLATFORM_PRICE_MAP_JSON`

### External Launch Checklist

- DNS work completed in this wave:
  - sender SPF record added at `send.microsaasfactory.io`
    - value: `"v=spf1 -all"`
  - DMARC record added at `_dmarc.microsaasfactory.io`
    - value: `"v=DMARC1; p=quarantine; pct=100"`
  - CAA records confirmed at apex:
    - `0 issue "pki.goog"`
    - `0 issuewild "pki.goog"`
- Platform operations completed in this wave:
  - Cloud Scheduler jobs configured and enabled:
    - `microsaas-factory-validation-crm`
    - `microsaas-factory-live-ops`
  - Monitoring assets confirmed:
    - log metric `microsaas_factory_automation_problem_count`
    - alert policy `MicroSaaS Factory automation problems`
- Authenticated production automation-route smoke completed:
  - `POST /api/internal/jobs/validation-crm/run` -> success
  - `POST /api/internal/jobs/live-ops/run` -> success
  - Firestore `automationRuns` document updated and persisted
- External blockers still open:
  - HTTP apex redirect still `302`
  - Firebase project bootstrap is not complete
  - Stripe platform secrets do not exist in Secret Manager
  - DKIM is not configured because no provider-issued sender-domain records were available to apply

## Verification Evidence

### Live Health

- `curl https://microsaasfactory.io/api/healthz`
- Result:
  - `pricingReady=true`
  - `signupIntentReady=true`
  - `checkoutReady=false`
  - `selfServeReady=false`
  - `automationReady=true`

### Edge Verification

- `.\scripts\verify-public-edge.ps1 -Domain microsaasfactory.io -ExpectPermanentRedirect`
- Current result:
  - pass: HSTS
  - pass: enforced CSP
  - pass: `/robots.txt`
  - pass: `/sitemap.xml`
  - pass: `/terms`
  - pass: `/privacy`
  - pass: `/api/healthz`
  - pass: sender SPF
  - pass: DMARC
  - pass: CAA
  - fail: apex HTTP redirect remains `302`

### Production Ops Evidence

- Cloud Scheduler:
  - `gcloud scheduler jobs list --project naylinnaung --location us-central1`
  - both jobs enabled against `https://microsaasfactory.io/api/internal/jobs/...`
- Monitoring:
  - `gcloud logging metrics describe microsaas_factory_automation_problem_count --project naylinnaung`
  - alert policy `MicroSaaS Factory automation problems` present and enabled
- Firestore automation state:
  - `automationRuns` document update time observed at `2026-04-22T04:04:52.154741Z`
  - persisted entry count observed at `24`

### Firebase Bootstrap Attempt

- Enabled APIs:
  - `firebase.googleapis.com`
  - `identitytoolkit.googleapis.com`
  - `apikeys.googleapis.com`
- Attempted to add Firebase to project `naylinnaung`.
- Blocker:
  - Firebase Management API request returned `PERMISSION_DENIED`
  - result: self-serve production readiness could not be completed from the current access level

### Stripe Launch State

- Secret Manager inventory still contains only:
  - `microsaas-factory-admin-access-key`
  - `microsaas-factory-encryption-key`
  - `microsaas-factory-internal-automation-key`
  - unrelated project secrets
- Result:
  - no platform Stripe secret or webhook secret exists to complete checkout readiness

## Current Residual Risks

- Stripe live checkout cannot be considered launch-complete until valid Stripe platform credentials and webhook verification are present.
- Firebase self-serve cannot be considered launch-complete until Firebase client and admin readiness are green in production.
- Long HSTS must not be promoted until HTTP redirect behavior is confirmed as permanent `301`.
- The current domain edge appears to be served through Google-managed frontend behavior that is still emitting `302`; no load balancer or project-local URL map was found to adjust this directly from the current project resources.
- Regulated-release claims remain out of scope while SBOM, traceability, and formal CR workflow gaps remain open.

## April 22, 2026 Guided Public Launch Alignment Addendum

### Summary

This addendum records the repo-side implementation and production deployment of the guided public launch refinement wave.

The objective of this wave was not to open full self-serve. The objective was to make the public site, founder billing surface, and admin commercialization console all express the same target posture:

- `platformBillingEnabled=true`
- `publicSignupEnabled=true`
- `selfServeProvisioningEnabled=false`
- `checkoutEnabled=false`

### Repo Changes Completed

- Refactored the shared public funnel contract so the public routes now read structured guided-launch state instead of route-local commercialization copy.
- Added launch-specific shared data for:
  - target flag posture
  - launch blocker summary
  - prioritized commercialization blockers
  - environment-aware trust/proof cards
  - per-surface guided-launch messaging
- Updated the public routes:
  - `/`
  - `/pricing`
  - `/signup`
  - `/login`
  - `/waitlist`
- Added a shared public launch board and trust grid for clearer commercialization state, stronger CTA context, and more explicit “what happens next” guidance.
- Aligned the founder workspace billing surface with the same guided-launch posture and operator-control explanation used on the public pricing page.
- Expanded the admin console with:
  - explicit guided-launch target flags
  - prioritized blockers for Firebase, Stripe, redirect posture, and DNS/email-auth
  - clearer commercialization sequencing around keeping self-serve and checkout off
- Updated rollout docs:
  - `README.md`
  - `scripts/cloud-ops-runbook.md`

### Test And Verification Changes Completed

- Added or updated unit coverage for:
  - guided public launch funnel derivation
  - homepage guided-launch rendering
  - pricing guided-launch rendering
  - signup/login/waitlist shared-funnel rendering
  - founder billing view-model alignment
  - admin commercialization target rendering
  - shared footer rollout posture rendering
- Updated browser regression coverage so the admin console and pricing surface explicitly prove the guided launch target remains visible while checkout stays hidden.

### Local Verification Completed

- `npm run lint` -> pass
- `npm test` -> pass (`154` tests)
- `npm run build` -> pass
- `npm run test:e2e` -> pass (`13` Playwright scenarios)
- `npm audit --audit-level=high` -> no High or Critical findings; only the existing `8` low-severity transitive findings remain
- `powershell -ExecutionPolicy Bypass -File .\scripts\verify-public-edge.ps1 -Domain microsaasfactory.io -ExpectPermanentRedirect` -> fail only on HTTP redirect posture (`302` instead of `301`)
- `docker build -t microsaas-factory-local .` -> blocked locally because Docker Desktop Linux engine pipe `//./pipe/dockerDesktopLinuxEngine` is unavailable

### Production Deployment Completed

- Successful Cloud Build deployment:
  - build ID: `c4dd7b9c-b1a1-4fa8-9b7e-735db88a97cb`
  - image: `us-central1-docker.pkg.dev/naylinnaung/microsaas-factory/web:deploy-20260422-3`
  - image digest: `sha256:78c8f80f548112e42e00a46ed526a5d34e5d2c18aa28dd816094ceddb7efe8b5`
  - status: `SUCCESS`
- Successful Cloud Run rollout:
  - revision: `microsaas-factory-00011-6kb`
  - traffic: `100%`
  - Cloud Run service remains Ready in `us-central1`
- Current Cloud Run runtime envs confirmed on the service after rollout:
  - present:
    - `MICROSAAS_FACTORY_DB_BACKEND=firestore`
    - `FIRESTORE_PROJECT_ID=naylinnaung`
    - `FIRESTORE_DATABASE_ID=microsaas-factory-db`
    - `MICROSAAS_FACTORY_FIRESTORE_COLLECTION=microsaasFactoryState`
    - `MICROSAAS_FACTORY_APP_URL=https://microsaasfactory.io`
    - Secret Manager refs for admin access, encryption key, and internal automation key
  - still missing:
    - Firebase client config (`NEXT_PUBLIC_FIREBASE_*`)
    - Firebase admin config (`FIREBASE_SERVICE_ACCOUNT_*`) or an implemented ADC-backed fallback
    - `STRIPE_PLATFORM_SECRET_KEY`
    - `STRIPE_PLATFORM_WEBHOOK_SECRET`
    - validated production `STRIPE_PLATFORM_PRICE_MAP_JSON`

### Post-Deploy Edge Verification

- `https://microsaasfactory.io/api/healthz` after deploy reported:
  - `pricingReady=true`
  - `signupIntentReady=true`
  - `checkoutReady=false`
  - `selfServeReady=false`
  - `automationReady=true`
- Public-edge verification after deploy passed:
  - HSTS
  - enforced CSP
  - `/robots.txt`
  - `/sitemap.xml`
  - `/terms`
  - `/privacy`
  - `/api/healthz`
  - sender SPF
  - DMARC
  - CAA
- Public-edge verification after deploy still failed on:
  - apex HTTP redirect remains `302` instead of the required `301`

### Residual Blockers After This Wave

- Guided public launch is materially stronger and is now deployed, but the application is still not at full public self-serve posture.
- `selfServeReady` remains `false` because production Firebase client/admin readiness is still incomplete.
- `checkoutReady` remains `false` because Stripe platform secrets and validated price mapping are still missing.
- Apex HTTP redirect still returns `302`, so long HSTS and final public-launch completion remain blocked.
