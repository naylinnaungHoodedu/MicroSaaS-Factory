# MicroSaaS Factory

> **The founder operating system for solo technical founders** — from research to launch, with connected ops and CRM intelligence.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.3-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-orange?logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-161%20unit%20%2B%2014%20e2e-brightgreen)](.)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Overview

MicroSaaS Factory is a full-stack web platform designed for solo SaaS founders who want to manage the entire product lifecycle — from market research and customer validation to spec writing, build tracking, connected integrations, and launch gating — all in a single unified workspace.

### Key Capabilities

| Stage | What It Does |
|-------|-------------|
| **Research** | Opportunity scoring engine with deterministic rubric + AI market readouts |
| **Validate** | CRM-grade lead ledger, touchpoint logging, transcript analysis, task management |
| **Spec** | One-page spec builder with V1 features, exclusions, launch criteria, and AI draft generation |
| **Build** | Release controls, ship checklist, blocker tracking, build readiness dashboard |
| **Ops** | Connected integrations (GitHub, GCP Cloud Run, Stripe, Resend) with automated health monitoring |
| **Launch** | 7-check launch gate, onboarding email sequences, MRR/churn/P1 tracking, "Ready for Next Product" signal |

### Platform Features

Current launch emphasis:

- One public Growth lane keeps pricing, signup, activation, and founder re-entry on one route contract.
- Firebase becomes the primary fast path when it is enabled, while invite-token recovery remains supported.
- Stripe Checkout is treated as workspace-aware billing, not a detached marketing checkout.
- `/api/healthz` now exposes minimal public-safe readiness plus shared go-live guidance.

- **Invite-Only Beta** — Admin-issued invite tokens with workspace provisioning
- **Staged Commercialization Funnel** — Public pricing plus operator-reviewed signup intent by default, with self-serve kept behind a separate activation flag
- **Self-Serve Signup Prep** — Firebase Auth (Google + email link) can be made ready before automatic provisioning is opened
- **Validation CRM** — Cross-product task inbox with overdue/snoozed/due-today bucketing
- **AI Generation** — Vertex AI (Flash/Pro) for specs, opportunity readouts, launch checklists, onboarding email copy
- **LiveOps Automation** — Scheduled integration refresh + CRM sweep with digest emails
- **Product Templates** — Pre-configured starting points (OEE Dashboard, Doc Search, Compliance Q&A)
- **Activity Timeline** — Full audit trail of founder, AI, and integration events

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Homepage  │  │  Admin   │  │ Workspace│  │   API    │   │
│  │ /login    │  │ Console  │  │ Dashboard│  │  Routes  │   │
│  │ /signup   │  │ /admin   │  │ /app/*   │  │ /api/*   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
├─────────────────────────────────────────────────────────────┤
│                   Server Actions Layer                       │
│              src/lib/server/actions.ts                       │
├─────────────────────────────────────────────────────────────┤
│                   Service Layer (4,487 lines)                │
│    ┌────────────┐  ┌──────────┐  ┌────────────────────┐    │
│    │ Product    │  │ Validation│  │ Integration Sync   │    │
│    │ Lifecycle  │  │ CRM      │  │ (GitHub/GCP/Stripe/ │    │
│    │ Management │  │ Engine   │  │  Resend)            │    │
│    └────────────┘  └──────────┘  └────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                  Persistence Layer                           │
│     ┌──────────────┐        ┌──────────────┐               │
│     │ Local JSON   │   OR   │  Firestore   │               │
│     │ (dev)        │        │  (production)│               │
│     └──────────────┘        └──────────────┘               │
├─────────────────────────────────────────────────────────────┤
│                  External Services                           │
│  Firebase Auth │ Vertex AI │ GitHub │ GCP │ Stripe │ Resend │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.2.3 (App Router, Turbopack) |
| **UI** | React 19, Server Components, Server Actions |
| **Language** | TypeScript (strict mode) |
| **Authentication** | Firebase Auth (Google + Email Link) + Invite Token |
| **Database** | Firestore (production) / Local JSON (development) |
| **AI** | Google Vertex AI (Gemini Flash / Pro) |
| **Integrations** | GitHub API, GCP Cloud Run/Build, Stripe, Resend |
| **Encryption** | AES-256-GCM for stored secrets |
| **Testing** | Vitest (97 unit tests) + Playwright (E2E) |
| **Deployment** | Docker → Google Cloud Run via Cloud Build |

---

## Local Setup

### Prerequisites

- Node.js 20+
- npm 10+

### Quick Start

```bash
# 1. Install dependencies
npm ci

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your values (see Environment Contract below)

# 3. Start development server
npm run dev
```

The app starts at `http://localhost:3000` with the local JSON backend writing to `.local/microsaas-factory-db.json`.

### First-Time Walkthrough

1. Open `http://localhost:3000/admin?key=YOUR_ADMIN_ACCESS_KEY`
2. Issue an invite to your email address
3. Open the invite link (e.g., `http://localhost:3000/invite/{token}`)
4. Activate the workspace → redirects to the founder dashboard
5. Create your first product and begin the research → launch pipeline

---

## Environment Contract

### Required Variables

| Variable | Description |
|----------|-------------|
| `ADMIN_ACCESS_KEY` | Secures the admin console (`/admin?key=...`) |
| `MICROSAAS_FACTORY_ENCRYPTION_KEY` | AES key for encrypting integration secrets |
| `MICROSAAS_FACTORY_DB_BACKEND` | `local` (dev) or `firestore` (production) |
| `MICROSAAS_FACTORY_APP_URL` | Absolute public app URL used for Stripe Checkout returns and scheduler setup |

### Optional Variables

| Variable | When Required |
|----------|--------------|
| `INTERNAL_AUTOMATION_KEY` | Secures internal automation job endpoints |
| `MICROSAAS_FACTORY_LOCAL_DB_FILE` | Override local DB file path |
| `MICROSAAS_FACTORY_LONG_HSTS` | Set to `1` only after the public edge is confirmed to issue a permanent HTTP -> HTTPS redirect |
| `FIRESTORE_SERVICE_ACCOUNT_JSON` | Firestore production credentials |
| `NEXT_PUBLIC_FIREBASE_*` | When Firebase Auth is enabled |
| `FIREBASE_SERVICE_ACCOUNT_*` | Canonical Firebase Admin env names for self-serve signup |
| `FIREBASE_ADMIN_CREDENTIALS_JSON` / legacy `FIREBASE_*` | Backward-compatible Firebase Admin aliases |
| `GITHUB_APP_ID` / `GITHUB_APP_PRIVATE_KEY` | GitHub App integration |
| `STRIPE_PLATFORM_SECRET_KEY` | Platform Stripe Checkout session creation |
| `STRIPE_PLATFORM_WEBHOOK_SECRET` | Stripe platform webhook verification |
| `STRIPE_PLATFORM_PRICE_MAP_JSON` | Public plan -> Stripe price ID mapping |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | GCP Cloud Run/Build integration |
| `VERTEX_PROJECT_ID` / `VERTEX_LOCATION` / `VERTEX_SERVICE_ACCOUNT_JSON(_BASE64)` | AI generation features |

See [`.env.example`](.env.example) for the complete variable reference.

---

## Testing

```bash
# Unit and route tests (Vitest)
npm test

# Browser E2E tests (Playwright)
npx playwright install chromium   # one-time setup
npm run test:e2e

# Full readiness check
npm run test:all
```

**Current status**: 161/161 Vitest tests passing and 14/14 Playwright scenarios passing.

Cloud Build now treats Playwright browser regression as a pre-deploy gate before the image build and Cloud Run deploy steps.

The Playwright harness runs against the standalone production build and uses an isolated database file via `MICROSAAS_FACTORY_LOCAL_DB_FILE`, so it does not mutate default development state.

---

## Production Deployment

### Docker + Cloud Run

```bash
# Build the Docker image
docker build -t microsaas-factory .

# Deploy to Cloud Run (via Cloud Build)
gcloud builds submit --config=cloudbuild.yaml --substitutions=_IMAGE_TAG=deploy-YYYYMMDD-1
```

The Dockerfile pins the Node 20 base image by digest for deterministic rebuild posture, but this repository still does **not** claim regulated-release readiness while SBOM, traceability, and formal CR workflow gaps remain open.

### Pre-Deployment Checklist

Additional production rollout items:

- Set `MICROSAAS_FACTORY_APP_URL` to the production hostname.
- Set `FIRESTORE_PROJECT_ID` explicitly in production, even when the Cloud Run project is already known through ADC.
- The final full-launch target posture is:
  - `platformBillingEnabled=true`
  - `publicSignupEnabled=true`
  - `selfServeProvisioningEnabled=true`
  - `checkoutEnabled=true`
- Keep at least one visible public plan live. The repo now seeds `growth` at `99` monthly / `990` annual when no visible public plan exists.
- For self-serve signup readiness, provide the full Firebase client suite plus `FIREBASE_SERVICE_ACCOUNT_*`, and do not keep `selfServeProvisioningEnabled=true` until `/api/healthz` reports `selfServeReady=true`.
- For platform billing, provide `STRIPE_PLATFORM_SECRET_KEY`, `STRIPE_PLATFORM_WEBHOOK_SECRET`, and `STRIPE_PLATFORM_PRICE_MAP_JSON`.
- Do not keep `checkoutEnabled=true` until `/api/healthz` reports `checkoutReady=true` and Stripe checkout has been exercised manually against the live environment.
- Review `/api/healthz.guidance.summary` and `guidance.repoControlledIssues` before treating the repo/runtime portion of launch as complete.
- Move runtime secrets to Secret Manager-backed Cloud Run refs instead of plain env vars.
- Confirm the public edge: permanent HTTP -> HTTPS redirect, `/robots.txt`, `/sitemap.xml`, and `/api/healthz` should all pass before enabling long HSTS.
- Run the scheduler, monitoring, and public-edge verification scripts in `scripts/` after deployment.
- Publish SPF, DMARC, DKIM, and CAA records before calling the public self-serve plus checkout launch complete.

1. ✅ Create an Artifact Registry repository for the container image
2. ✅ Set `MICROSAAS_FACTORY_DB_BACKEND=firestore` with valid Firestore credentials
3. ✅ Set a strong `MICROSAAS_FACTORY_ENCRYPTION_KEY` (NOT the default `change-me`)
4. ✅ Configure Cloud Run runtime secrets outside source control
5. ✅ Provide Firebase, GitHub, Stripe, and Resend secrets for enabled features

### Infrastructure

| Service | Purpose |
|---------|---------|
| **Cloud Run** | Hosts the Next.js standalone server |
| **Firestore** | Production database |
| **Cloud Build** | CI/CD pipeline |
| **Artifact Registry** | Docker image storage |
| **Firebase Auth** | User authentication (optional) |
| **Cloud Scheduler** | Triggers validation CRM and live ops automation |
| **Cloud Monitoring** | Alerts on failed or partial automation runs |

### Reproducible Runtime Config

Provision the dedicated runtime service account:

```powershell
pwsh ./scripts/setup-cloud-run-service-account.ps1 `
  -ProjectId YOUR_GCP_PROJECT `
  -ServiceAccountName microsaas-factory-runner
```

Then update Cloud Run with the required plain env vars and Secret Manager refs:

```powershell
pwsh ./scripts/configure-cloud-run-runtime.ps1 `
  -ProjectId YOUR_GCP_PROJECT `
  -AppUrl https://microsaasfactory.io `
  -FirestoreProjectId YOUR_GCP_PROJECT `
  -RuntimeServiceAccountEmail microsaas-factory-runner@YOUR_GCP_PROJECT.iam.gserviceaccount.com `
  -StripePlatformPriceMapJson '{"growth":{"monthly":"price_monthly_123","annual":"price_annual_123"}}'
```

The runtime script always sets:

- `MICROSAAS_FACTORY_DB_BACKEND=firestore`
- `FIRESTORE_PROJECT_ID`
- `FIRESTORE_DATABASE_ID`
- `MICROSAAS_FACTORY_FIRESTORE_COLLECTION`
- `MICROSAAS_FACTORY_APP_URL`

And it supports Secret Manager refs for:

- `ADMIN_ACCESS_KEY`
- `MICROSAAS_FACTORY_ENCRYPTION_KEY`
- `INTERNAL_AUTOMATION_KEY`
- `STRIPE_PLATFORM_SECRET_KEY`
- `STRIPE_PLATFORM_WEBHOOK_SECRET`
- `FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY`
- Optional GitHub / Google service-account private credentials

### Runtime Health

`GET /api/healthz` is intentionally minimal and public-safe:

- `ok=true` means the deployment is production-safe for its current flag posture.
- `readiness.pricingReady` tracks whether public pricing can be shown.
- `readiness.signupIntentReady` tracks whether operator-reviewed signup can be exposed.
- `readiness.checkoutReady` tracks whether Stripe checkout is fully configured.
- `readiness.selfServeReady` tracks whether Firebase-backed self-serve activation is ready.
- `guidance.summary` gives the shared repo/runtime go-live summary used by public, founder, and operator surfaces.
- `guidance.nextStep` gives the next rollout move after the current build is deployed.
- `guidance.repoControlledIssues` lists remaining Firebase, Stripe, pricing, signup, or automation issues still visible from checked-in/runtime truth.
- `guidance.externalVerification` lists the live-edge and DNS checks that still require human rollout verification.

Detailed auth, storage, and readiness diagnostics remain server-side in the admin console.

---

## Feature Flags

The platform behavior is controlled by global feature flags managed via the admin console:

| Flag | Default | Description |
|------|---------|-------------|
| `inviteOnlyBeta` | `true` | Require admin-issued invite tokens |
| `publicWaitlist` | `true` | Show waitlist request form |
| `publicSignupEnabled` | `true` | Allow public signup or staged workspace creation from visible plans |
| `selfServeProvisioningEnabled` | `false` | Auto-provision workspaces on signup once Firebase readiness is green |
| `checkoutEnabled` | `false` | Enable Stripe checkout flows |
| `platformBillingEnabled` | `true` | Show pricing plans publicly |
| `proAiEnabled` | `false` | Enable Gemini Pro model (vs Flash only) |

Production guardrails now reject unsafe flag transitions. Public pricing and signup require at least one visible public plan, self-serve provisioning requires Firebase readiness, and Checkout requires platform billing visibility plus Stripe Checkout readiness.

---

## Scheduler and Monitoring

After Cloud Run is live, provision the recurring automation jobs:

```powershell
pwsh ./scripts/setup-cloud-scheduler.ps1 `
  -ProjectId YOUR_GCP_PROJECT `
  -ServiceUrl https://microsaasfactory.io `
  -AutomationKey YOUR_INTERNAL_AUTOMATION_KEY `
  -Region us-central1
```

This creates:

- `POST /api/internal/jobs/validation-crm/run` every 4 hours
- `POST /api/internal/jobs/live-ops/run` every 6 hours

Then create the log-based metric and alert policy:

```powershell
pwsh ./scripts/setup-monitoring-alerts.ps1 `
  -ProjectId YOUR_GCP_PROJECT `
  -NotificationEmail ops@example.com `
  -Region us-central1
```

If you already have a Monitoring notification channel, you can still pass `-NotificationChannel` directly.

See `scripts/cloud-ops-runbook.md` for the full operating runbook.

## Public Edge Verification

Use the verification script after each production rollout:

```powershell
pwsh ./scripts/verify-public-edge.ps1 `
  -Domain microsaasfactory.io `
  -ExpectPermanentRedirect `
  -ExpectLongHsts
```

This checks the public root headers, `robots.txt`, `sitemap.xml`, `/api/healthz`, HTTP redirect behavior, and the visible DNS records for MX/TXT/DMARC/CAA posture.

---

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Public homepage
│   ├── login/                    # Login page
│   ├── signup/                   # Signup flow
│   ├── waitlist/                 # Waitlist form
│   ├── pricing/                  # Pricing plans
│   ├── invite/[token]/           # Invite acceptance
│   ├── admin/                    # Admin console
│   ├── app/                      # Authenticated workspace
│   │   ├── page.tsx              # Founder dashboard
│   │   ├── crm/                  # CRM inbox
│   │   └── products/[id]/        # Product lifecycle pages
│   └── api/                      # API routes
│       ├── auth/firebase/session # Firebase session exchange
│       ├── products/             # Product CRUD
│       ├── signup-intents/       # Self-serve signup
│       ├── internal/jobs/        # Automation endpoints
│       └── webhooks/             # GitHub & Stripe webhooks
├── components/                   # React components
│   ├── firebase-login-panel.tsx  # Firebase Auth UI
│   └── ui/                       # Shared UI components
└── lib/                          # Core business logic
    ├── types.ts                  # Domain model (624 lines)
    ├── constants.ts              # Enums, defaults, labels
    ├── templates.ts              # Product template catalog
    ├── utils.ts                  # Formatting utilities
    ├── firebase/                 # Client-side Firebase
    └── server/                   # Server-only modules
        ├── services.ts           # Business logic (4,487 lines)
        ├── actions.ts            # Server actions (665 lines)
        ├── db.ts                 # Database abstraction
        ├── auth.ts               # Session management
        ├── auth-mode.ts          # Auth mode detection
        ├── crypto.ts             # AES-256-GCM encryption
        ├── ai.ts                 # Vertex AI text generation
        ├── integrations.ts       # External service sync
        └── ops-health.ts         # Integration health summarizer
```

---

## API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/auth/firebase/session` | POST | Firebase ID token | Exchange Firebase token for session cookie |
| `/api/products` | POST | Founder session | Create product |
| `/api/products/[id]/[...action]` | POST | Founder session | Product actions (connect, refresh, etc.) |
| `/api/products/[id]/template/apply` | POST | Founder session | Apply product template |
| `/api/signup-intents` | POST | Public | Create signup intent |
| `/api/internal/jobs/validation-crm/run` | POST | Automation key | Run CRM sweep |
| `/api/internal/jobs/live-ops/run` | POST | Automation key | Run LiveOps automation |
| `/api/webhooks/github` | POST | HMAC signature | GitHub push/PR/release events |
| `/api/webhooks/stripe/platform` | POST | Public | Stripe subscription events |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
