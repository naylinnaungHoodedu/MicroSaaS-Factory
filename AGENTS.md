---
version: 1.0.0
last_reviewed: 2026-04-21
owners:
  - "{{TBD: create /CODEOWNERS and name accountable owners}}"
risk_class: "{{TBD: confirm declared project risk class; no SIL/ASIL/GAMP/EU-AI-Act classification was found in-repo}}"
scope:
  - "/"
  - "All files unless a deeper AGENTS.md exists"
  - "Nearest nested AGENTS.md wins within its subtree"
spec_refs:
  - "RFC 2119"
  - "21 CFR Part 11 Sec. 11.10(e)"
  - "EU AI Act Article 9"
  - "EU AI Act Article 10"
  - "EU AI Act Article 12"
  - "EU AI Act Article 15"
---

## 1. Precedence & Scope

1.1.1 MUST apply the nearest `AGENTS.md` to every edited path; verify with `rg --files -g "AGENTS.md"` and compare each changed file to the deepest matching file.
# Rationale: Prevents lower-risk rules from overriding stricter local controls.

1.1.2 MUST treat explicit human instructions as higher priority than this file only for `STANDARD` paths in Section 2 and only when Sections 6 and 7 are not weakened; verify with `git diff --name-only HEAD` plus the Section 2 path table.
# Rationale: Keeps humans in control without bypassing safety or release controls.

1.1.3 MUST NOT override any Section 6 or Section 7 `MUST` or `MUST NOT` rule without a formal Change Request ID in the latest commit message or task record; verify with `git log -1 --pretty=%B | rg "CR-[0-9]+"` or record `{{TBD: formal CR system path}}`.
# Rationale: Preserves traceable deviation control for high-consequence changes.

1.1.4 MUST treat `/CODEOWNERS` as a governance dependency for `CONTROLLED` and `FROZEN` paths; until `/CODEOWNERS` exists, such changes MUST stop for human reviewer assignment before completion. Verify with `test -f CODEOWNERS || echo "BLOCKED: CODEOWNERS missing"`.
# Rationale: Prevents agent-only approval on code that affects runtime, auth, data, or deployment.

1.1.5 MUST reference rather than duplicate controls already defined in `tsconfig.json`, `package.json`, `Dockerfile`, `cloudbuild.yaml`, `.env.example`, `README.md`, and `scripts/cloud-ops-runbook.md`; verify with `rg -n "tsconfig.json|package.json|Dockerfile|cloudbuild.yaml|.env.example|cloud-ops-runbook.md" AGENTS.md`.
# Rationale: Reduces policy drift across duplicated documents.

## 2. Repo Layout

```text
/
|-- src/app/                 # Next.js App Router; CONTROLLED under api/ and admin/, STANDARD elsewhere
|-- src/components/          # React UI; STANDARD except auth/admin integration surfaces
|-- src/lib/server/          # Server runtime, auth, persistence, integrations; CONTROLLED
|-- src/lib/firebase/        # Client Firebase config; CONTROLLED
|-- scripts/                 # Deploy, runtime, ops verification; CONTROLLED
|-- e2e/                     # Playwright browser regression suite; STANDARD
|-- public/                  # Static assets; STANDARD
|-- .local/ .next/ test-results/  # GENERATED
|-- Dockerfile cloudbuild.yaml .env.example  # CONTROLLED release artifacts
`-- safety/ validated/       # FROZEN reserved names; currently absent
```

| path | risk class | ownership / approval |
| --- | --- | --- |
| `/src/lib/server/**` | `CONTROLLED` | `{{TBD: CODEOWNERS owner}}`; human review required |
| `/src/lib/firebase/**` | `CONTROLLED` | `{{TBD: CODEOWNERS owner}}`; human review required |
| `/src/app/api/**` | `CONTROLLED` | `{{TBD: CODEOWNERS owner}}`; human review required |
| `/src/app/admin/**` | `CONTROLLED` | `{{TBD: CODEOWNERS owner}}`; human review required |
| `/scripts/**` | `CONTROLLED` | `{{TBD: CODEOWNERS owner}}`; human review required |
| `/Dockerfile`, `/cloudbuild.yaml`, `/.env.example`, `/next.config.ts`, `/src/instrumentation.ts` | `CONTROLLED` | `{{TBD: CODEOWNERS owner}}`; human review required |
| `/src/app/**` excluding `/src/app/api/**` and `/src/app/admin/**` | `STANDARD` | normal review |
| `/src/components/**` excluding auth/admin integration surfaces | `STANDARD` | normal review |
| `/src/lib/**` excluding `/src/lib/server/**` and `/src/lib/firebase/**` | `STANDARD` | normal review |
| `/e2e/**`, `/public/**`, `/README.md`, `/ACTIVITY_LOG.md`, `/DEVELOPMENT_ACTIVITY_LOG.md` | `STANDARD` | normal review |
| `/.local/**`, `/.next/**`, `/test-results/**`, `/tsconfig.tsbuildinfo` | `GENERATED` | no manual edits; regenerate only |
| `/safety/**`, `/validated/**` | `FROZEN` | 2 human reviewers + QA sign-off + `CR-...`; currently absent |

2.1.1 MUST NOT hand-edit `GENERATED` paths; verify with `git diff --name-only HEAD -- .local .next test-results tsconfig.tsbuildinfo`.
# Rationale: Generated artifacts destroy reproducibility and audit value when edited manually.

2.1.2 MUST classify every new top-level directory into `FROZEN`, `CONTROLLED`, `STANDARD`, or `GENERATED` before editing it; verify with `git diff --name-only HEAD` and compare against the table above.
# Rationale: Unclassified paths are uncontrolled scope expansion.

2.1.3 MUST reserve `/safety/**` and `/validated/**` as `FROZEN`; verify with `test ! -d safety && test ! -d validated || echo "FROZEN PATH PRESENT"`.
# Rationale: Gives validated or safety-critical code a non-bypassable namespace.

2.1.4 MUST treat auth, billing, encryption, persistence, webhook, and deployment changes as `CONTROLLED` even when they originate from UI files; verify with `rg -n "firebase|stripe|encrypt|session|webhook|runtime|healthz" src/app src/components`.
# Rationale: Risk follows behavior, not file extension.

## 3. Environment & Setup

Bootstrap from a clean checkout:

```bash
test -f package-lock.json && npm ci && npm run lint && npm test && npm run build
```

Browser regression gate when public, auth, or API-backed UI changes:

```bash
npx playwright install chromium && npm run test:e2e
```

3.1.1 MUST install dependencies with `npm ci` against `package-lock.json`; verify with `test -f package-lock.json && npm ci`.
# Rationale: Lockfile-resolved installs reduce drift between local, CI, and Cloud Build.

3.1.2 MUST use the Node 20 baseline already declared in `Dockerfile` and `cloudbuild.yaml`; verify with `rg -n "node:20-bookworm-slim" Dockerfile cloudbuild.yaml`.
# Rationale: Toolchain skew breaks reproducibility and supportability.

3.1.3 MUST treat `.env.example` as the checked-in environment contract and keep secrets out of source control; verify with `git check-ignore -v .env.local` and `rg -n "change-me|_SECRET|PRIVATE_KEY" .env.example`.
# Rationale: Keeps runtime configuration explicit while preventing accidental secret commits.

3.1.4 MUST treat missing container digest pinning as a regulated-release blocker; verify with `rg -n "^FROM .*@" Dockerfile || echo "BLOCKED: pin Docker base image digests"`.
# Rationale: Untyped mutable base tags break deterministic rebuild and forensic replay.

3.1.5 MUST leave GPU, CUDA, and training-driver controls inactive until GPU workloads exist; verify with `rg -n "cuda|cudnn|nvidia|torch|tensorflow" . || true`.
# Rationale: Avoids pretending a GPU assurance story exists when the repo is CPU and web only.

3.1.6 MUST use the standalone production build path already defined by Next.js and the Docker runner; verify with `rg -n "output: \"standalone\"" next.config.ts && rg -n "server.js" Dockerfile package.json`.
# Rationale: Aligns local, test, and deployed execution paths.

## 4. Conventions

4.1.1 MUST keep TypeScript strict mode enabled; verify with `rg -n "\"strict\":\\s*true" tsconfig.json`.
# Rationale: Strict typing reduces silent runtime faults in a mixed server/client codebase.

4.1.2 MUST pass the repository ESLint baseline before completion; verify with `npm run lint`.
# Rationale: The current lint config is the only enforced style and static-quality gate in-repo.

4.1.3 MUST NOT introduce `@ts-ignore` or source-level `any` outside test matchers; verify with `rg -n "@ts-ignore|\\bany\\b" src e2e scripts | rg -v "expect\\.any"`.
# Rationale: Unchecked types create hidden behavior changes that reviews miss.

4.1.4 MUST NOT introduce `eval`, `new Function`, or `child_process` outside `scripts/e2e-web-server.mjs`; verify with `rg -n "eval\\(|new Function|Function\\(|child_process|exec\\(|spawn\\(" src e2e scripts | rg -v "scripts/e2e-web-server\\.mjs"`.
# Rationale: Dynamic execution and shell spawning widen the attack surface and complicate validation.

4.1.5 MUST keep production-operational logs as structured JSON with fields `event`, `kind`, `status`, `summary`, `metrics`, and `error`; verify with `rg -n "event:|kind:|status:|summary:|metrics:|error:" src/lib/server/services-core.ts scripts/cloud-ops-runbook.md`.
# Rationale: Structured logs support machine audit, alerting, and post-incident reconstruction per 21 CFR Part 11 Sec. 11.10(e).

4.1.6 MUST update `package-lock.json` whenever `package.json` changes; verify with `if git diff --name-only HEAD -- package.json | grep -q package.json; then git diff --name-only HEAD -- package-lock.json | grep -q package-lock.json; fi`.
# Rationale: Dependency graph changes without a lockfile update are non-reproducible.

4.2.1 Python conventions are inactive and MUST remain inactive until `.py` files or `pyproject.toml` appear; verify with `rg --files -g "*.py" -g "pyproject.toml"`.
# Rationale: Inactive scaffolding avoids fake compliance for a language not present in this repo.

4.3.1 Rust conventions are inactive and MUST remain inactive until `.rs` files or `Cargo.toml` appear; verify with `rg --files -g "*.rs" -g "Cargo.toml"`.
# Rationale: Inactive scaffolding avoids fake compliance for a language not present in this repo.

## 5. ML-Specific Rules

5.1.1 MUST treat the current repository as `inference-only`; no in-repo training, feature store, model registry, or dataset pipeline exists today. Verify with `rg --files -g "models/**" -g "training/**" -g "contracts/**" -g "MODEL_CARD.md" -g "DATASET_CARD.md" || true`.
# Rationale: The repo currently integrates external Vertex AI calls but does not contain a validated training system.

5.1.2 MUST centralize model identifiers and generation parameters in `src/lib/server/ai.ts`; callers MUST request only `"flash"` or `"pro"`. Verify with `rg -n "model: \"flash\" \\| \"pro\"|gemini-2\\.5-(flash|pro)|temperature" src/lib/server/ai.ts src/lib/server/services-core.ts`.
# Rationale: Centralizing model configuration constrains non-determinism and review surface per EU AI Act Article 15.

5.1.3 MUST stop and ask before adding `/training/**`, `/models/**`, or `/contracts/**` without a nested `AGENTS.md`, `MODEL_CARD.md`, and `DATASET_CARD.md`; verify with `test ! -d training && test ! -d models && test ! -d contracts || echo "BLOCKED: add nested ML governance files"`.
# Rationale: Training assets need their own controls for drift, leakage, and promotion.

5.2.1 MUST add versioned data contracts under `/contracts/**` before expanding persisted schemas, webhook payload mappings, or AI-derived stored fields; until `/contracts/**` exists, such schema-expanding changes MUST stop and ask. Verify with `test -d contracts || echo "BLOCKED: /contracts missing for schema expansion"`.
# Rationale: Schema drift without contracts causes train/serve skew, migration breakage, and hidden data loss per EU AI Act Article 10.

5.2.2 MUST keep train/validation/test split integrity, leakage checks, and eval-set contamination controls inactive until a training subtree exists; if `/training/**` appears, the same change MUST define split policy and holdout rules. Verify with `test ! -d training || rg -n "train|validation|test|holdout|leak" training AGENTS.md`.
# Rationale: Declaring split controls only when training exists avoids fake assurance.

5.2.3 MUST NOT hardcode secrets, live credentials, or direct PII/PHI tokens into prompts, logs, fixtures, or source; verify with `rg -n "(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|ghp_[A-Za-z0-9]+|sk_live_[A-Za-z0-9]+|AIza[0-9A-Za-z_-]{35})" .`.
# Rationale: Sensitive-data leakage is both a security defect and an ML-governance defect.

5.2.4 MUST keep legal disclosures synchronized with actual data collection and storage behavior; verify with `git diff --name-only HEAD -- src/app/privacy/page.tsx src/app/terms/page.tsx .env.example README.md`.
# Rationale: Users and auditors need an accurate account of what data is collected, stored, and shared.

5.3.1 MUST keep model-registry stage gates `dev -> staging -> prod-shadow -> prod` inactive until a registry path and commands are declared in-repo; verify with `rg -n "prod-shadow|model registry|registry stage" . || echo "INACTIVE: registry not declared"`.
# Rationale: Promotion claims without a registry and evidence chain are not auditable per EU AI Act Article 12.

5.3.2 MUST log any change to model defaults, auth posture for self-serve AI flows, or public readiness gates in `ACTIVITY_LOG.md` and `DEVELOPMENT_ACTIVITY_LOG.md`; verify with `git diff --name-only HEAD -- src/lib/server/ai.ts src/lib/server/runtime-config.ts ACTIVITY_LOG.md DEVELOPMENT_ACTIVITY_LOG.md`.
# Rationale: Silent model-behavior changes are a primary ML operations failure mode.

## 6. Safety-Critical Rules

6.1.1 MUST treat `Dockerfile`, `cloudbuild.yaml`, `next.config.ts`, `.env.example`, `scripts/**`, `src/app/api/**`, `src/lib/server/**`, `src/lib/firebase/**`, and `src/instrumentation.ts` as validated-state boundaries; verify with `git diff --name-only HEAD -- Dockerfile cloudbuild.yaml next.config.ts .env.example scripts src/app/api src/lib/server src/lib/firebase src/instrumentation.ts`.
# Rationale: These paths control production behavior, secrets, persistence, or external side effects.

6.1.2 MUST update both `ACTIVITY_LOG.md` and `DEVELOPMENT_ACTIVITY_LOG.md` whenever Section 6.1.1 paths change, until a formal traceability matrix path exists; verify with `if git diff --name-only HEAD -- Dockerfile cloudbuild.yaml next.config.ts .env.example scripts src/app/api src/lib/server src/lib/firebase src/instrumentation.ts | grep -q .; then git diff --name-only HEAD -- ACTIVITY_LOG.md DEVELOPMENT_ACTIVITY_LOG.md | grep -q .; fi`.
# Rationale: Keeps a traceable audit trail while a formal validation matrix is still missing.

6.1.3 MUST NOT edit `/safety/**` or `/validated/**` without `CR-...`, 2 human reviewers, and QA sign-off; verify with `test ! -d safety && test ! -d validated || git log -1 --pretty=%B | rg "CR-[0-9]+"`.
# Rationale: Validated or safety-critical code cannot be modified by prompt alone.

6.2.1 MUST prove deterministic buildability from the checked-in sources before completion; verify with:

```bash
npm ci && npm run lint && npm test && npm run build && docker build -t microsaas-factory-local .
```

# Rationale: Rebuildable artifacts are required for rollback, audit, and incident response.

6.2.2 MUST treat missing `SOURCE_DATE_EPOCH` and missing Docker digest pins as regulated-release blockers; verify with `printf '%s\n' "${SOURCE_DATE_EPOCH:-}" && rg -n "^FROM .*@" Dockerfile || echo "BLOCKED: reproducibility inputs incomplete"`.
# Rationale: Reproducible-build metadata is mandatory for high-assurance release replay.

6.2.3 MUST update `scripts/cloud-ops-runbook.md` whenever deployment, runtime-secret, monitoring, or edge-verification behavior changes; verify with `if git diff --name-only HEAD -- cloudbuild.yaml scripts .env.example next.config.ts | grep -q .; then git diff --name-only HEAD -- scripts/cloud-ops-runbook.md | grep -q .; fi`.
# Rationale: Rollback and incident steps are safety artifacts, not optional documentation.

6.3.1 MUST preserve computer-generated, time-stamped operational evidence through structured logs and activity records; verify with `rg -n "automationRuns|generatedAt|JSON.stringify\\(|microsaas_factory_automation_(warning|failure)" src/lib/server scripts`.
# Rationale: Audit-trail integrity is required by 21 CFR Part 11 Sec. 11.10(e).

6.3.2 MUST generate and review an SBOM before claiming regulated release readiness; until SBOM tooling exists in-repo, such a claim is BLOCKED. Verify with `test -f sbom.spdx.json || test -f sbom.cdx.json || echo "BLOCKED: SBOM artifact missing"`.
# Rationale: Component provenance and diff review are required for supply-chain assurance.

6.3.3 MUST treat Critical CVEs as 24-hour and High CVEs as 7-day remediation targets, or record a CR-backed deviation; verify with `npm audit --audit-level=high`.
# Rationale: Known exploitable dependencies invalidate safety and compliance claims.

## 7. Command Allowlist / Confirm-list / Denylist

### Allowlist

| command | reason | exception holder |
| --- | --- | --- |
| `npm ci` | lockfile-resolved dependency install | none |
| `npm run lint` | static policy gate | none |
| `npm test` | unit, route, and service regression gate | none |
| `npm run build` | standalone production-build gate | none |
| `npm run test:e2e` | browser regression gate | none |
| `rg --files` | non-mutating repo inspection | none |
| `git diff --name-only` | change-scope inspection | none |
| `docker build -t microsaas-factory-local .` | local reproducibility check | none |

### Confirm-list

| command | reason | exception holder |
| --- | --- | --- |
| `npm install <pkg>@<version> --save-exact` | mutates the dependency graph and lockfile | `{{TBD: dependency owner from /CODEOWNERS}}` |
| `gcloud builds submit --config=cloudbuild.yaml ...` | remote build and deploy side effects | `{{TBD: release owner from /CODEOWNERS}}` |
| `pwsh ./scripts/configure-cloud-run-runtime.ps1 ...` | mutates production runtime configuration and secret refs | `{{TBD: release owner from /CODEOWNERS}}` |
| `pwsh ./scripts/setup-cloud-scheduler.ps1 ...` | mutates automation infrastructure | `{{TBD: ops owner from /CODEOWNERS}}` |
| `pwsh ./scripts/setup-monitoring-alerts.ps1 ...` | mutates monitoring and paging behavior | `{{TBD: ops owner from /CODEOWNERS}}` |
| `pwsh ./scripts/verify-public-edge.ps1 ...` | performs live-edge network checks against a named domain | `{{TBD: ops owner from /CODEOWNERS}}` |

### Denylist

| command | reason | exception holder |
| --- | --- | --- |
| `git push --force` | rewrites published history and destroys auditability | no exception via agent |
| `git reset --hard` | destructive workspace rewrite | no exception via agent |
| `rm -rf` | destructive delete with weak path safety | no exception via agent |
| `terraform apply` | mutates infrastructure outside the checked-in runtime scripts | no exception via agent |
| `alembic upgrade head` | unsupported schema mutation path for this repo | no exception via agent |
| `pip install <pkg>` | bypasses the active Node lockfile and introduces unmanaged tooling | no exception via agent |
| `curl -X POST https://microsaasfactory.io/...` | mutates live public endpoints outside reviewed scripts | no exception via agent |
| `echo ... > /safety/...` | writes reserved `FROZEN` paths without change control | no exception via agent |

## 8. Testing Strategy

| layer | local run command | CI gate | minimum threshold |
| --- | --- | --- | --- |
| Unit and route tests | `npm test` | `cloudbuild.yaml` step `npm test` | 100% pass rate on the existing Vitest suite; `{{TBD: add line coverage tooling and thresholds}}` |
| Build and runtime smoke | `npm run build` | `cloudbuild.yaml` step `npm run build` | 100% pass rate |
| Browser integration | `npm run test:e2e` | `{{TBD: add Playwright CI job path}}` | 100% pass rate whenever `src/app/**`, `src/components/**`, `src/app/api/**`, or `e2e/**` changes |
| Contract and persistence regression | `npm test` | `cloudbuild.yaml` step `npm test` | all affected API, service, and persistence tests pass when `src/app/api/**`, `src/lib/server/**`, or `src/lib/types.ts` changes |
| ML-specific inference regression | `npm test` and `rg -n "gemini-2\\.5-(flash|pro)|temperature" src/lib/server/ai.ts` | `cloudbuild.yaml` unit-test step | no unreviewed model-ID or temperature drift; all related tests pass |
| Property-based tests | `{{TBD: add property-based command}}` | `{{TBD: add property-based CI gate}}` | BLOCKED until tooling exists |
| Fairness slices and drift checks | `{{TBD: add fairness and drift commands}}` | `{{TBD: add fairness and drift CI gate}}` | BLOCKED until domain, protected attributes, and reference datasets are declared |
| Security and dependency scan | `npm run lint && npm audit --audit-level=high && rg -n "(BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|ghp_[A-Za-z0-9]+|sk_live_[A-Za-z0-9]+|AIza[0-9A-Za-z_-]{35})" .` | `cloudbuild.yaml` lint step plus `{{TBD: add secret/SBOM/container scan CI}}` | no new High/Critical CVEs; no secret-hit regex matches |

8.1.1 MUST treat missing property-based, fairness, drift, SBOM, and container-scan tooling as unresolved gaps rather than silently passing them; verify with `rg -n -F "{{TBD:" AGENTS.md`.
# Rationale: Stated-but-unenforced controls are worse than visible gaps.

## 9. Quality Gates - Definition of Done

- [ ] `npm run lint` exited `0`.
- [ ] `npm test` exited `0`.
- [ ] `npm run build` exited `0`.
- [ ] `npm run test:e2e` exited `0` when `git diff --name-only HEAD -- src/app src/components src/app/api e2e | grep -q .`, or the skip reason is recorded in both activity logs.
- [ ] `git diff --name-only HEAD -- package.json` is empty, or `git diff --name-only HEAD -- package-lock.json` is non-empty.
- [ ] `npm audit --audit-level=high` reports no new High/Critical findings, or the approved deviation cites `CR-...`.
- [ ] `git diff --name-only HEAD -- Dockerfile cloudbuild.yaml next.config.ts .env.example scripts src/app/api src/lib/server src/lib/firebase src/instrumentation.ts` is empty, or both `ACTIVITY_LOG.md` and `DEVELOPMENT_ACTIVITY_LOG.md` changed.
- [ ] `git diff --name-only HEAD -- src/lib/server/ai.ts .env.example src/app/privacy/page.tsx src/app/terms/page.tsx` is empty, or the legal/runtime changes are consistent in the same change set.
- [ ] `test ! -d training && test ! -d models && test ! -d contracts`, or nested ML governance files exist in the same change.
- [ ] `test -f CODEOWNERS`, or completion is explicitly blocked pending human reviewer assignment for `CONTROLLED` and `FROZEN` paths.

## 10. Escalation & Ambiguity

10.1.1 MUST stop and ask when two rules conflict, rather than averaging them; verify with `git diff --name-only HEAD` and cite the conflicting rule IDs in the task record.
# Rationale: Rule conflicts are governance defects, not agent discretion opportunities.

10.1.2 MUST stop and ask when the task expands into an unclassified directory, a new language, or a new deployment surface; verify with `git diff --name-only HEAD` and Section 2.
# Rationale: Unplanned scope expansion invalidates the original risk assumptions.

10.1.3 MUST stop and ask when a claim cannot be backed by command output, test output, or a checked-in path; verify with the supporting command output or `printf '%s\n' "{{TBD: evidence missing}}"`.
# Rationale: Unverifiable claims break auditability and review quality.

10.1.4 MUST stop and ask before touching any `FROZEN` path or any `CONTROLLED` path while `/CODEOWNERS` and reviewer identity are unresolved; verify with `test -f CODEOWNERS || echo "BLOCKED: reviewer identity unresolved"`.
# Rationale: High-risk changes need accountable human ownership.

10.1.5 MUST stop and ask when `AGENTS.md` itself contains a `{{TBD: ...}}` directly relevant to the requested task; verify with `rg -n -F "{{TBD:" AGENTS.md`.
# Rationale: Missing governance inputs are blocking requirements, not fill-in-the-blank opportunities.

10.1.6 MUST default to `stop and ask; do not guess` whenever ambiguity remains after Sections 1 through 9; verify with `git diff --name-only HEAD` and the recorded escalation question.
# Rationale: Guessing is the wrong failure mode for validated or externally visible changes.

## 11. Worked Examples

### 11.1 Add a TypeScript dependency

11.1.1 MUST inspect scope, confirm the dependency change, then update both manifest and lockfile together.
# Rationale: Dependency changes are supply-chain changes.

```bash
git diff --name-only HEAD
npm install <package>@<version> --save-exact
npm run lint && npm test && npm run build
git diff --name-only HEAD -- package.json package-lock.json ACTIVITY_LOG.md DEVELOPMENT_ACTIVITY_LOG.md
```

### 11.2 Fix a High CVE via dependency bump

11.2.1 MUST reproduce the finding, bump the smallest safe version, and rerun the full local gate before proposing deploy actions.
# Rationale: Security fixes still require reproducibility and regression evidence.

```bash
npm audit --audit-level=high
npm install <package>@<fixed-version> --save-exact
npm run lint && npm test && npm run build
docker build -t microsaas-factory-local .
```

### 11.3 Retrain and promote a model through stage gates

11.3.1 MUST block this workflow today because the repo does not contain a validated training, registry, or dataset-governance subtree.
# Rationale: A promotion story without training controls is fictitious assurance.

```bash
test ! -d training && test ! -d models && echo "BLOCKED: add /training, /models, /contracts, MODEL_CARD.md, DATASET_CARD.md, and nested AGENTS.md first"
printf '%s\n' "{{TBD: deterministic training command}}"
printf '%s\n' "{{TBD: evaluation command with leakage and drift checks}}"
printf '%s\n' "{{TBD: registry promotion command dev->staging->prod-shadow->prod}}"
```

## 12. Metadata

12.1.1 MUST review this file at least once per calendar quarter; verify with `rg -n "^last_reviewed:" AGENTS.md`.
# Rationale: Governance documents decay faster than application code when left unreviewed.

12.1.2 MUST keep the owner list synchronized with `/CODEOWNERS`; until `/CODEOWNERS` exists, this file is not governance-complete. Verify with `test -f CODEOWNERS || echo "BLOCKED: owner map missing"`.
# Rationale: Named accountability is required for change approval and audit response.

12.1.3 MUST version this file and change `version` on normative rule changes; verify with `rg -n "^version:" AGENTS.md`.
# Rationale: Versioned policy lets reviewers correlate behavior with the governing spec revision.

12.1.4 MUST deprecate this file only by replacing it with a newer `AGENTS.md` that points to the successor for at least one review cycle; verify with `git diff --name-only HEAD -- AGENTS.md`.
# Rationale: Hard cuts create compliance gaps for agents and auditors alike.

Appendix A - Assumptions, Risks & Verification

- [ASSUMPTION] Repository name was inferred from `package.json` as `microsaas-factory`.
- [ASSUMPTION] Active stack was inferred from checked-in files as Next.js 16, React 19, TypeScript strict, Firebase Auth, Firestore, and Vertex AI integration.
- [ASSUMPTION] Deployment target was inferred from `Dockerfile`, `cloudbuild.yaml`, and `README.md` as Docker to Google Cloud Run via Cloud Build.
- [ASSUMPTION] Topology was inferred as a single application repository, not a monorepo with multiple package roots.
- [ASSUMPTION] No `/CODEOWNERS`, `/SECURITY.md`, `/CONTRIBUTING.md`, `/.pre-commit-config.yaml`, `/Makefile`, `/Taskfile`, `/pyproject.toml`, or `/conftest.py` was found.
- [ASSUMPTION] No in-repo training pipeline, model registry, feature store, contracts directory, `MODEL_CARD.md`, or `DATASET_CARD.md` was found.
- [ASSUMPTION] Current ML posture is inference-only through `src/lib/server/ai.ts`.
- [ASSUMPTION] `ACTIVITY_LOG.md` and `DEVELOPMENT_ACTIVITY_LOG.md` are the current trace artifacts until a formal traceability matrix exists.
- [ASSUMPTION] No `.github/` CI or PR-template workflow was found; Cloud Build is the only checked-in CI signal.
- [ASSUMPTION] Domain, regulatory regime, failure cost, and formal risk classification remain unresolved and therefore stay visible as `{{TBD: ...}}`.

| risk | rule ID |
| --- | --- |
| Unauthorized change to runtime, auth, billing, or deploy logic | `2.1.4`, `6.1.1`, `6.1.2` |
| Non-reproducible build or rollback failure | `3.1.1`, `3.1.4`, `6.2.1`, `6.2.2` |
| Silent model-behavior drift in Vertex AI integrations | `5.1.2`, `5.3.2`, `8.1.1` |
| PII, secret, or credential leakage into code, prompts, or logs | `4.1.5`, `5.2.3`, `8.1.1` |
| Loss of audit trail or undocumented deviation | `1.1.3`, `6.1.2`, `6.3.1` |

Acceptance criteria for `AGENTS.md` itself:

```bash
test "$(wc -l < AGENTS.md)" -le 600
rg -n "^## 1\\. Precedence & Scope$|^## 2\\. Repo Layout$|^## 3\\. Environment & Setup$|^## 4\\. Conventions$|^## 5\\. ML-Specific Rules$|^## 6\\. Safety-Critical Rules$|^## 7\\. Command Allowlist / Confirm-list / Denylist$|^## 8\\. Testing Strategy$|^## 9\\. Quality Gates - Definition of Done$|^## 10\\. Escalation & Ambiguity$|^## 11\\. Worked Examples$|^## 12\\. Metadata$|^Appendix A - Assumptions, Risks & Verification$" AGENTS.md
rg -n "MUST|MUST NOT|SHOULD|SHOULD NOT|MAY" AGENTS.md
rg -n -F "{{TBD:" AGENTS.md
```

Agent-compliance test strategy:

1. Red-team prompt suite: `{{TBD: add /tests/agents-md/red-team-prompts.md}}`; verify current gap with `test -f tests/agents-md/red-team-prompts.md || echo "BLOCKED: red-team prompt suite missing"`.
2. Dry-run session replay: `{{TBD: add /scripts/agents-md/replay-session.sh}}`; verify current gap with `test -f scripts/agents-md/replay-session.sh || echo "BLOCKED: replay harness missing"`.
3. PR rule-citation linter: `{{TBD: add /scripts/agents-md/check-rule-citations.sh}}`; verify current gap with `test -f scripts/agents-md/check-rule-citations.sh || echo "BLOCKED: rule-citation linter missing"`.

Open questions:

1. [BLOCKING] Who owns `/CODEOWNERS`, and what are the actual reviewer groups for `CONTROLLED` and `FROZEN` paths?
2. [BLOCKING] What is the declared project risk class and regulatory regime for this repository: `{{TBD: SIL/ASIL/GAMP/EU AI Act/medical/other}}`?
3. [BLOCKING] What formal Change Request identifier format and storage system should replace `{{TBD: formal CR system path}}`?
4. [BLOCKING] What path should hold the formal traceability matrix that replaces the temporary activity-log requirement?
5. [BLOCKING] What SBOM, secret-scan, container-scan, and coverage tooling should be added, and where should their CI entrypoints live?
6. [BLOCKING] If training or local model artifacts are planned, what are the approved registry, dataset manifest, split policy, and promotion commands?
