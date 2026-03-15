# Qredex Node SDK Agent Instructions

## Mission

Build and maintain the Qredex Node server SDK as a production-grade machine-to-machine integrations package.

This SDK is not a generic API wrapper.
It is the canonical Node distribution layer for Qredex server integrations.

Package target:
- `qredex`

Primary audience:
- merchant backends
- platform integrations
- server-to-server consumers of the Qredex Integrations API

Out of scope:
- browser/runtime agent logic
- Merchant API SDK
- Internal API SDK
- Shopify embedded/session flows
- human dashboard concerns

---

## Core Product Rule

The Node SDK must make the canonical Qredex machine flow easy and hard to misuse:

1. authenticate
2. create/read creators
3. create/read links
4. issue IIT where backend issuance is appropriate
5. lock PIT where authenticated machine lock is appropriate
6. submit paid orders
7. submit refunds

Do not invent alternate flows.

---

## Authoritative Sources

Treat these as authoritative and align implementation to them:

- `docs/sdk/SDK_STRATEGY.md`
- `docs/sdk/SDK_BLUEPRINT.md`
- `docs/sdk/MERCHANT_INTEGRATION_CHECKLIST.md`
- `docs/auth/AUTH_MODEL.md`
- `docs/API_ZONING.md`
- `docs/attribution/INGESTION_MODEL.md`
- `docs/attribution/ATTRIBUTION_MODEL.md`
- `docs/openapi/qredex-api-v1.openapi.yaml`

If docs conflict in a way that blocks safe implementation, stop and surface the conflict clearly before proceeding.
If the broader authoritative docs establish a clear canonical direction and one artifact appears stale, proceed narrowly, document the drift, and avoid inventing new behavior.

---

## Efficiency, Quality, and Infrastructure Discipline

Use the minimum context, tokens, tool calls, edits, and validation needed to complete the task correctly.

### Working Rules

- Read narrowly first. Expand only when needed for correctness.
- Edit narrowly, but include every directly connected change required for the result to be correct.
- Validate with the lightest check that gives real confidence the work is correct and safe.
- Do not scan the whole codebase unless the task truly requires it.
- Do not perform broad refactors, broad searches, speculative cleanup, or optional exploration unless requested or clearly necessary.
- Do not invent new flows, abstractions, endpoints, or patterns if the existing architecture already supports the task.
- Reuse existing code paths, commands, adapters, and conventions wherever possible.
- Keep responses short, direct, and action-focused.

### Quality Guardrails

- Accuracy is mandatory.
- Completeness matters more than superficial minimalism.
- Minimal work does not mean shallow work.
- If a wider check is required for safety, correctness, or integration integrity, do it — but keep it tightly scoped.
- If a requested change likely affects adjacent logic, inspect the smallest necessary connected surface before editing.
- Make the narrowest correct change, not the fastest careless change.

### Qredex Guardrails

- Preserve determinism, idempotency, zoning, tenant scoping, and store scoping.
- Keep changes layer-correct and aligned with the existing architecture.
- Prefer canonical flows over parallel implementations.
- Avoid duplicate logic, fragmented behavior, and unnecessary abstractions.

### Infrastructure and Platform Judgment

- Act like a senior infrastructure/platform engineer, not a code generator.
- Proactively recommend the most durable, secure, operationally safe, and platform-aligned path when it is materially better than the requested implementation.
- Favor standardization, observability, deterministic behavior, contract clarity, and clean boundaries over clever shortcuts.
- Call out drift, weak boundaries, duplicated responsibility, leaky abstractions, and anything that undermines Qredex as a platform.
- Treat naming, packaging, SDK boundaries, auth surfaces, API shape, and execution flow as strategic platform decisions, not local implementation details.
- When several options are viable, recommend the one that best improves long-term reliability, maintainability, developer experience, and platform leverage.

### Model Usage Limit Discipline

- Treat Codex and other model/agent usage limits as a hard engineering constraint.
- Optimize for minimum usage without degrading correctness, safety, or architectural quality.
- Stop exploring once sufficient evidence exists. Do not keep reading or probing after the safe implementation path is already clear.
- Use the fewest files, shortest useful command output, and narrowest validation that still provides real confidence.
- Avoid speculative work. Do not expand scope unless the task or integration risk requires it.
- Keep communication compressed, direct, and high-signal.
- Escalate only when necessary. If materially more usage would be required to increase certainty, state the trade-off briefly before doing broader exploration or heavier validation.

---

## SDK Scope Rules

### V1 Must Cover

- `POST /api/v1/auth/token`
- `POST /api/v1/integrations/creators`
- `GET /api/v1/integrations/creators/{creator_id}`
- list creators
- `POST /api/v1/integrations/links`
- `GET /api/v1/integrations/links/{link_id}`
- list links
- `POST /api/v1/integrations/intents/token`
- `POST /api/v1/integrations/intents/lock`
- `POST /api/v1/integrations/orders/paid`
- `POST /api/v1/integrations/orders/refund`

### V1 Must Not Cover

- `/api/v1/merchant/**`
- `/api/v1/internal/**`
- browser/runtime cart logic
- public redirect simulation
- Shopify OAuth/session exchange
- full API mirroring beyond the curated integrations surface

---

## Scope Escalation Rule

If work suggests adding:
- Merchant API support
- Internal API support
- browser/runtime logic
- webhook receiver frameworks
- broad API mirroring

stop and surface the scope change before implementing it.

---

## Canonical Naming Rules

Preserve Qredex language exactly where it matters:

- IIT = Influence Intent Token
- PIT = Purchase Intent Token
- Order Attribution
- `token_integrity`
- `integrity_reason`
- `resolution_status`

Do not rename these into generic terms like:
- tracking token
- conversion token
- affiliate token

The SDK should feel idiomatic in Node/TypeScript, but the Qredex domain words must remain canonical.

---

## Public API Design Rules

The public SDK surface must be handwritten and curated, even if transport is generated from OpenAPI.

### Preferred Shape

- `Qredex`
- `qredex.creators`
- `qredex.links`
- `qredex.intents`
- `qredex.orders`
- `qredex.refunds`

Example shape:

```ts
const qredex = Qredex.bootstrap();

await qredex.creators.create({...});
await qredex.links.create({...});
await qredex.intents.issueInfluenceIntentToken({...});
await qredex.intents.lockPurchaseIntent({...});
await qredex.orders.recordPaidOrder({...});
await qredex.refunds.recordRefund({...});
```

### Design Constraints

- Use request objects, not long positional argument lists.
- Keep the public surface small.
- Do not leak low-level transport primitives as the primary API.
- Do not hide deterministic Qredex response fields behind vague booleans.
- Preserve important response facts instead of flattening them away.

Bad:
```ts
if (response.successfulAttribution) { ... }
```

Good:
```ts
response.resolution_status
response.token_integrity
response.integrity_reason
```

### Idempotency And Outcome Rules

- Do not collapse ingestion outcomes into generic success booleans.
- Preserve canonical Qredex outcomes such as `INGESTED`, `IDEMPOTENT`, `REJECTED_SOURCE_POLICY`, and `REJECTED_CROSS_SOURCE_DUPLICATE`.
- Treat these as platform facts that must remain visible in SDK responses and docs where applicable.
- Prefer explicit outcome fields and documented caller behavior over convenience abstractions that hide replay semantics.

---

## Auth Rules

Auth should be managed automatically in normal usage, but remain observable and configurable.

Required:
- token issuance via client credentials
- token reuse until expiry
- configurable timeout/retry/token cache behavior

Do not force the SDK user to manually obtain and inject tokens for normal use.

Do not expose auth/bootstrap as the primary mental model in docs.

---

## Error Model

The SDK must expose a typed error model.

Minimum categories:
- `AuthenticationError`
- `AuthorizationError`
- `ValidationError`
- `ConflictError`
- `RateLimitError`
- `ApiError`
- `NetworkError`

Each error should preserve:
- HTTP status
- Qredex `error_code`
- message
- request id / trace id when available
- raw response body when useful for debugging

Do not swallow Qredex `error_code`.

---

## Security Rules

- Never log client secrets, bearer tokens, IITs, or PITs in plaintext by default.
- Redact sensitive values in logs and debug output.
- Keep auth behavior explicit and secure.
- Do not implement convenience features that weaken the platform contract.

---

## TypeScript Rules

- TypeScript-first implementation
- strong typing on public models
- avoid `any`
- strict null handling
- prefer explicit types over clever inference in public SDK surfaces

---

## Repository Structure Expectations

Use a structure close to:

- `src/`
- `src/client/`
- `src/resources/`
- `src/errors/`
- `src/types/`
- `src/transport/`
- `examples/`
- `tests/`
- `docs/`

The exact layout may vary, but the separation between:
- public client layer
- resource/domain modules
- error model
- transport layer
must stay clear.

---

## Generated Code Policy

Using OpenAPI-generated transport code is allowed.

But:
- generated code must not become the public SDK surface
- public exports must be curated and stable
- transport regeneration must not break consumer ergonomics

---

## Publishing Rules

- Do not publish unstable or incomplete surfaces as public API.
- Keep internal helpers unexported unless they are intentionally part of the contract.
- Keep the package entrypoint clean and minimal.

---

## Testing Requirements

Every behavior-changing implementation must include tests.

### Test Boundary Rules

- Unit and contract tests must run by default.
- Live integration tests against a real Qredex API must be isolated and opt-in.
- Do not make local or CI success depend on external environments unless explicitly configured.

### Minimum Test Coverage

Happy path:
- token issuance
- create/get/list creator
- create/get/list link
- issue IIT
- lock PIT
- record paid order
- record refund

Failure path:
- invalid credentials
- invalid request payload
- conflict response
- rate limit response
- network failure

Contract behavior:
- auth header correctness
- request serialization correctness
- error parsing correctness

If live integration tests are added, keep them isolated and explicit.

---

## Documentation Requirements

The SDK repo must include:

- `README.md`
- `INTEGRATION_GUIDE.md`
- `ERRORS.md`
- example usage

Docs must explain:
- what the SDK is for
- what it is not for
- canonical IIT -> PIT -> paid/refund flow
- auth behavior
- common integration mistakes to avoid

---

## Decision Protocol

Before implementing a non-trivial design choice:

1. classify the choice
   - `VALID`
   - `MISPLACED_LAYER`
   - `INVALID`
   - `UNVERIFIED`
2. cite the relevant authoritative docs or code contract
3. only then implement

If a suggestion weakens:
- determinism
- idempotency
- auth boundaries
- canonical naming
- platform consistency

call that out clearly before proceeding.

When multiple viable approaches exist:
- present the top 2
- state tradeoffs
- recommend one

---

## Plan Mode Rule

Use plan mode whenever work is more than 3 steps or affects architecture.

Plan must include:
- tasks
- risks
- acceptance criteria

If evidence shows the original plan is wrong, stop and re-plan.

---

## Definition of Done

Do not mark work complete unless all are true:

- scope matches the Integrations API only
- public API is curated and typed
- no browser or merchant/internal SDK drift introduced
- errors are typed and preserve Qredex contract details
- docs are updated
- examples exist
- tests cover happy and failure paths
- no secret logging
- no unused code
- implementation remains aligned with the authoritative Qredex docs

---

## Final Reminder

The Node SDK is the first public server SDK.
Treat it as the reference implementation for the rest of the language family.

Optimize for:
- platform consistency
- integration correctness
- merchant adoption speed
- long-term maintainability

Not for:
- exposing every endpoint
- clever abstractions
- local convenience that weakens the canonical Qredex model
