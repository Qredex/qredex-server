# Qredex Node SDK Design Principles

## Purpose

`qredex` is the canonical Node.js server SDK for the Qredex Integrations API.

It is not a generic API wrapper.
It is the production distribution layer for machine-to-machine Qredex integrations.

The SDK should feel:

- solid
- intuitive
- hard to misuse
- aligned with the Qredex platform contract

---

## Core Design Goals

1. Make the canonical Qredex machine flow easy:
   1. authenticate
   2. create or fetch creators
   3. create or fetch links
   4. issue IIT when backend issuance is appropriate
   5. lock PIT when authenticated machine lock is appropriate
   6. record paid orders
   7. record refunds
2. Preserve contract fidelity over SDK prettification.
3. Keep the public API small, typed, and highly legible.
4. Keep transport, retries, token refresh, and parsing behind the SDK boundary.
5. Prefer explicit behavior over clever abstractions.

---

## Recommended Patterns

### 1. Facade

Expose one configured client as the main entrypoint:

```ts
const client = Qredex.init({
  auth: { clientId, clientSecret },
});
```

The client should own:

- auth
- transport
- configuration
- resource access
- sanitized observability

This keeps integrations discoverable and predictable.

### 2. Static Factory

Use `Qredex.init(...)` as the canonical construction path.

Why:

- one obvious way to start
- room for future bootstrap logic without public constructor churn
- easy to document and hard to misuse

Avoid exposing multiple equivalent construction styles.

### 3. Resource Namespaces

Organize methods by domain:

- `client.creators`
- `client.links`
- `client.intents`
- `client.orders`
- `client.refunds`

This mirrors API zoning and keeps the mental model stable.

### 4. Request DTOs

Every operation should accept a typed request object.

Good:

```ts
await client.links.create({
  store_id,
  creator_id,
  link_name,
  destination_path,
});
```

Avoid positional arguments and overloaded signatures.

### 5. Internal Strategy Boundaries

Keep auth mode, token cache, retry policy, and fetch implementation swappable internally.

This improves maintainability without expanding the public API.

### 6. Typed Event Stream

Expose sanitized SDK lifecycle events through:

- `onEvent`
- `client.events`

This is the preferred observability pattern for the SDK.

Avoid generic middleware or interceptor stacks as the default extension model.

---

## Public API Shape

The recommended public shape is:

```ts
const client = Qredex.init({
  environment: "production",
  auth: {
    clientId,
    clientSecret,
  },
});

await client.auth.issueToken();
await client.auth.clearTokenCache();

await client.creators.create(request, callOptions);
await client.creators.get({ creator_id }, callOptions);
await client.creators.list(filters, callOptions);

await client.links.create(request, callOptions);
await client.links.get({ link_id }, callOptions);
await client.links.list(filters, callOptions);

await client.intents.issueInfluenceIntentToken(request, callOptions);
await client.intents.lockPurchaseIntent(request, callOptions);

await client.orders.recordPaidOrder(request, callOptions);
await client.refunds.recordRefund(request, callOptions);
```

Method naming rules:

- use short verbs where the namespace already provides context:
  - `create`
  - `get`
  - `list`
- use explicit domain names where the operation would otherwise be ambiguous:
  - `issueInfluenceIntentToken`
  - `lockPurchaseIntent`
  - `recordPaidOrder`
  - `recordRefund`

---

## Client Construction

Recommended construction:

```ts
const client = Qredex.init({
  auth: { clientId, clientSecret },
});
```

Environment selection should be preset-based:

- `production` -> `https://api.qredex.com`
- `staging` -> `https://staging-api.qredex.com`
- `development` -> `http://localhost:8080`

Rules:

- production is the default
- `environment` is the normal host-selection mechanism
- `baseUrl` may exist as an internal/testing override for non-production environments
- users should not need to pass a base URL in normal usage

Avoid:

- public fluent builders
- multiple equally valid construction entrypoints
- env-var magic as the primary configuration model

---

## Config And Auth Model

The SDK should support exactly two auth modes:

1. client credentials
2. static access token

Normal usage should be automatic:

- issue tokens through `/api/v1/auth/token`
- cache tokens safely
- refresh before expiry
- make auth state observable without exposing secrets

Configuration should stay explicit and narrow:

- `auth`
- `environment`
- `timeoutMs`
- `readRetry`
- `onEvent`
- `clock`
- `defaultHeaders`

Avoid forcing callers to manually issue, store, or refresh tokens in normal usage.

---

## Request And Response Patterns

### Requests

- accept request objects, not positional arguments
- keep transport options in a second argument
- validate obvious high-mistake inputs locally before sending requests

Example:

```ts
await client.orders.recordPaidOrder(
  {
    store_id,
    external_order_id,
    currency: "USD",
  },
  {
    requestId: "req-123",
    timeoutMs: 5_000,
  },
);
```

### Responses

- export explicit response interfaces for every operation
- preserve canonical Qredex fields exactly
- keep snake_case where the platform contract uses snake_case
- do not wrap API responses in vague `success: boolean` envelopes

Preserve fields like:

- `resolution_status`
- `token_integrity`
- `integrity_reason`

Avoid:

- camelCase remapping of canonical API fields
- invented convenience fields that obscure platform semantics
- flattening attribution outcomes into booleans

---

## Error Handling

Use a typed error hierarchy with full context.

The public error surface should preserve:

- HTTP status
- `error_code`
- message
- request ID
- trace ID
- parsed response body when available
- raw response text when parsing fails

The core categories should be:

- `ConfigurationError`
- `ApiError`
- `AuthenticationError`
- `AuthorizationError`
- `ValidationError`
- `ConflictError`
- `RateLimitError`
- `NetworkError`

Rules:

- never leak raw fetch or transport library errors as the primary public error type
- preserve Qredex `error_code`
- do not collapse all failures into one generic SDK error

---

## Idempotency And Retries

Idempotency is a platform concern and must stay explicit.

Current guidance:

- do not auto-retry writes
- do retry auth token issuance internally
- allow read retries only when explicitly configured
- keep retry behavior bounded and observable

For order and refund correctness, prefer canonical platform identifiers:

- `external_order_id`
- `external_refund_id`

Do not invent SDK-generated idempotency keys unless Qredex adds an explicit idempotency-key contract.

Avoid:

- hidden retries on writes
- auto-retrying `409` conflicts
- retry policies that ignore platform semantics

---

## Naming And Developer Experience

Preserve Qredex naming where it matters:

- IIT
- PIT
- Order Attribution
- `token_integrity`
- `integrity_reason`
- `resolution_status`

DX principles:

- one obvious way to construct the client
- one obvious place to find each resource
- one obvious request shape per method
- explicit second-argument call options for transport concerns
- built-in sanitized observability

The SDK should feel like a disciplined infrastructure package, not a convenience wrapper.

---

## Platform Boundary Alignment

The SDK must remain aligned with Qredex platform boundaries.

Include:

- Integrations API auth
- creators
- links
- intents
- paid orders
- refunds

Do not include:

- `/api/v1/merchant/**`
- `/api/v1/internal/**`
- browser/runtime logic
- Shopify OAuth/session exchange
- invented parallel flows outside the canonical IIT -> PIT -> order -> refund model

Avoid abstractions that blur:

- tenant scoping
- store scoping
- zoning
- ingestion semantics

---

## Patterns To Avoid

- public fluent builders
- generic middleware/interceptor stacks as the default extension model
- generic generated-client public APIs
- camelCase remapping of canonical Qredex fields
- cursor pagination abstractions unless the API itself supports them
- auto-pagination helpers that invent backend behavior
- hidden retries on writes
- broad “success” wrappers that hide attribution details
- logging secrets, bearer tokens, IITs, or PITs

---

## What Makes The SDK Infrastructure-Grade

The SDK feels professional when it is:

- deterministic by default
- strict about platform boundaries
- explicit about retry and error behavior
- strongly typed end to end
- observable without leaking secrets
- aligned with the exact Qredex contract
- small on the surface and disciplined internally

The goal is not maximum abstraction.
The goal is a stable, trustworthy integration layer that helps merchants implement Qredex correctly the first time.
