# `@qredex/node`

Canonical Node.js server SDK for the Qredex Integrations API.

This package is for machine-to-machine integrations only. It covers:

- `POST /api/v1/auth/token`
- `/api/v1/integrations/creators/**`
- `/api/v1/integrations/links/**`
- `/api/v1/integrations/intents/token`
- `/api/v1/integrations/intents/lock`
- `POST /api/v1/integrations/orders/paid`
- `POST /api/v1/integrations/orders/refund`

It does not include merchant dashboard APIs, internal APIs, Shopify OAuth/session exchange, or browser agent behavior.

## Install

```bash
npm install @qredex/node
```

## Quick Start

```ts
import { QredexClient } from "@qredex/node";

const client = QredexClient.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
  },
});

const creator = await client.creators.create({
  handle: "alice",
  display_name: "Alice",
});

const link = await client.links.create({
  store_id: process.env.QREDEX_STORE_ID!,
  creator_id: creator.id,
  link_name: "spring-launch",
  destination_path: "/products/spring-launch",
});
```

## Public API

```ts
const client = QredexClient.init({ auth });

await client.auth.issueToken();

await client.creators.create(request);
await client.creators.get({ creator_id });
await client.creators.list(filters);

await client.links.create(request);
await client.links.get({ link_id });
await client.links.list(filters);

await client.intents.issueInfluenceIntentToken(request);
await client.intents.lockPurchaseIntent(request);

await client.orders.recordPaidOrder(request);
await client.refunds.recordRefund(request);
```

## Design Notes

- Single configured client entrypoint.
- Environment-first configuration with canonical host presets:
  - `production` -> `https://api.qredex.com`
  - `staging` -> `https://staging-api.qredex.com`
  - `development` -> `http://localhost:8080`
- Automatic client-credentials auth with in-memory token caching by default.
- Request objects instead of long positional argument lists.
- Typed Qredex error hierarchy preserving HTTP status, `error_code`, message, and request/trace IDs when available.
- Transport stays internal; the public surface is curated and handwritten.
- Request/response DTOs stay close to the Qredex API contract and preserve canonical field names like `token_integrity` and `integrity_reason`.
- Typed client events and sanitized lifecycle hooks for observability without leaking secrets.

## Auth Behavior

Normal usage is automatic:

```ts
const client = QredexClient.init({
  auth: {
    clientId,
    clientSecret,
    scope: [
      "direct:creators:write",
      "direct:links:write",
      "direct:intents:write",
      "direct:orders:write",
    ],
  },
});
```

The SDK:

- issues access tokens through `/api/v1/auth/token`
- reuses cached tokens until they approach expiry
- validates high-mistake request fields before sending them
- never logs secrets or bearer tokens by default
- supports custom token caches, logging hooks, typed sanitized events, timeout overrides, and explicit token issuance through `client.auth.issueToken()`

## Environment Selection

Production is the default, so most integrations do not need to pass any host configuration.

```ts
const productionClient = QredexClient.init({
  auth: { clientId, clientSecret },
});
```

Use presets when you need staging or local development:

```ts
const stagingClient = QredexClient.init({
  environment: "staging",
  auth: { clientId, clientSecret },
});

const developmentClient = QredexClient.init({
  environment: "development",
  auth: { clientId, clientSecret },
});
```

`baseUrl` still exists as an advanced override for controlled testing, but it should not be the normal integration path.

## Events And Observability

You can observe sanitized lifecycle events with either `onEvent` or `client.events`.

```ts
const client = QredexClient.init({
  auth: { clientId, clientSecret },
  onEvent(event) {
    if (event.type === "response") {
      console.log(event.type, event.method, event.path, event.status);
    }
  },
});
```

```ts
const unsubscribe = client.events.on("retry_scheduled", (event) => {
  console.log(event.source, event.reason, event.attempt);
});
```

Event types include:

- `request`
- `response`
- `response_error`
- `network_error`
- `auth_token_issued`
- `auth_cache_hit`
- `auth_cache_miss`
- `retry_scheduled`
- `validation_failed`

## Retry Behavior

- Auth token issuance retries internally using the configured auth retry policy.
- Normal API writes are not retried automatically.
- Read retries are opt-in and only apply to `GET` and `HEAD`.

```ts
const client = QredexClient.init({
  auth: { clientId, clientSecret },
  readRetry: {
    maxAttempts: 2,
    baseDelayMs: 250,
    maxDelayMs: 1_000,
  },
});
```

## Deterministic Testing

You can inject a deterministic clock for auth timing and event assertions:

```ts
const client = QredexClient.init({
  auth: { clientId, clientSecret },
  clock: {
    now: () => Date.parse("2026-03-15T12:00:00Z"),
  },
});
```

## Canonical Flow

1. Authenticate with client credentials.
2. Create or fetch creators.
3. Create or fetch links.
4. Issue IIT for backend click flows.
5. Lock PIT for authenticated machine flows.
6. Record the paid order.
7. Record refunds later with stable external refund IDs.

See [docs/INTEGRATION_GUIDE.md](/Users/bobai/Workspace/Qredex/qredex-node/docs/INTEGRATION_GUIDE.md) for the full flow and [docs/ERRORS.md](/Users/bobai/Workspace/Qredex/qredex-node/docs/ERRORS.md) for failure handling.

## Testing

- `npm test` runs unit tests with mocked transport
- `npm run test:live` runs the opt-in live integration suite in [`tests/live.integration.test.ts`](/Users/bobai/Workspace/Qredex/qredex-node/tests/live.integration.test.ts)

Live tests are skipped unless `QREDEX_LIVE_ENABLED=1` and the required `QREDEX_LIVE_*` environment variables are set.

To target staging, set `QREDEX_LIVE_ENVIRONMENT=staging` before `npm run test:live`.

## Releasing

See [docs/RELEASING.md](/Users/bobai/Workspace/Qredex/qredex-node/docs/RELEASING.md) for the release checklist and publish flow.

## Examples

- [examples/auth-and-create-creator.ts](/Users/bobai/Workspace/Qredex/qredex-node/examples/auth-and-create-creator.ts)
- [examples/create-link.ts](/Users/bobai/Workspace/Qredex/qredex-node/examples/create-link.ts)
- [examples/issue-iit.ts](/Users/bobai/Workspace/Qredex/qredex-node/examples/issue-iit.ts)
- [examples/lock-pit.ts](/Users/bobai/Workspace/Qredex/qredex-node/examples/lock-pit.ts)
- [examples/record-paid-order.ts](/Users/bobai/Workspace/Qredex/qredex-node/examples/record-paid-order.ts)
- [examples/record-refund.ts](/Users/bobai/Workspace/Qredex/qredex-node/examples/record-refund.ts)
