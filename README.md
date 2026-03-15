# `@qredex/server`

[![CI](https://github.com/Qredex/qredex-node/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Qredex/qredex-node/actions/workflows/ci.yml)
[![Release](https://github.com/Qredex/qredex-node/actions/workflows/publish-npm.yml/badge.svg)](https://github.com/Qredex/qredex-node/actions/workflows/publish-npm.yml)
[![npm version](https://img.shields.io/npm/v/%40qredex%2Fserver.svg)](https://www.npmjs.com/package/@qredex/server)
[![bundle size](https://img.shields.io/bundlephobia/minzip/%40qredex%2Fserver)](https://bundlephobia.com/package/@qredex/server)
[![license](https://img.shields.io/npm/l/%40qredex%2Fserver)](./LICENSE)

Canonical Node.js server SDK for Qredex machine-to-machine integrations.

`qredex` for Node.js is built for backend systems that need to create creators and links, issue IITs, lock PITs, and record paid orders and refunds without dealing with raw HTTP plumbing.

## Install

```bash
npm install @qredex/server
```

## Quick Start

Set these environment variables:

- `QREDEX_CLIENT_ID`
- `QREDEX_CLIENT_SECRET`

Optional environment configuration:

- `QREDEX_STORE_ID` for flows that create links or record orders for a specific store
- `QREDEX_SCOPE`
- `QREDEX_ENVIRONMENT` defaults to `production`

Then use the SDK:

```ts
import { Qredex } from "@qredex/server";

const qredex = Qredex.bootstrap();

const creator = await qredex.creators.create({
  handle: "alice",
  display_name: "Alice",
});

const link = await qredex.links.create({
  store_id: process.env.QREDEX_STORE_ID!,
  creator_id: creator.id,
  link_name: "spring-launch",
  destination_path: "/products/spring-launch",
});
```

## Why This SDK

- automatic client-credentials auth with token caching
- request objects instead of long parameter lists
- typed responses that preserve canonical Qredex field names
- typed errors with `status`, `error_code`, `requestId`, and `traceId`
- sanitized SDK events for observability without leaking secrets
- deterministic behavior aligned with the canonical machine integration flow around IIT -> PIT -> order -> refund

## Public API

```ts
const qredex = Qredex.bootstrap();

await qredex.creators.create(request);
await qredex.creators.get({ creator_id });
await qredex.creators.list(filters);

await qredex.links.create(request);
await qredex.links.get({ link_id });
await qredex.links.list(filters);

await qredex.intents.issueInfluenceIntentToken(request);
await qredex.intents.lockPurchaseIntent(request);

await qredex.orders.list({ page: 0, size: 20 });
await qredex.orders.getDetails(orderAttributionId);
await qredex.orders.recordPaidOrder(request);
await qredex.refunds.recordRefund(request);
```

## Resource Capability Table

| Resource | Methods | Typical scopes |
| --- | --- | --- |
| `creators` | `create`, `get`, `list` | `QredexScope.CREATORS_WRITE`, `QredexScope.CREATORS_READ` |
| `links` | `create`, `get`, `list` | `QredexScope.LINKS_WRITE`, `QredexScope.LINKS_READ` |
| `intents` | `issueInfluenceIntentToken`, `lockPurchaseIntent` | `QredexScope.INTENTS_WRITE` |
| `orders` | `list`, `getDetails`, `recordPaidOrder` | `QredexScope.ORDERS_READ`, `QredexScope.ORDERS_WRITE` |
| `refunds` | `recordRefund` | `QredexScope.ORDERS_WRITE` |

If you want programmatic configuration instead of environment bootstrap:

```ts
import { Qredex, QredexEnvironment, QredexScope } from "@qredex/server";

const qredex = Qredex.init({
  environment: QredexEnvironment.STAGING,
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: [QredexScope.CREATORS_WRITE, QredexScope.LINKS_WRITE],
  },
});
```

## Environment Model

Use `QREDEX_ENVIRONMENT` only when you need `staging` or `development`. Most integrations can omit it and stay on the default `production` environment.

## Auth And Observability

Normal auth is automatic. If you want to observe or preflight token issuance explicitly, do it on the same `qredex` instance:

```ts
const qredex = Qredex.bootstrap();

await qredex.auth.issueToken();
```

If you want bootstrap to request specific scopes, set `QREDEX_SCOPE` as a space-delimited list:

```bash
export QREDEX_SCOPE="direct:creators:write direct:links:write"
```

If you want typed scope constants in code, use `QredexScope`:

```ts
import { QredexScope } from "@qredex/server";

const scopes = [
  QredexScope.CREATORS_WRITE,
  QredexScope.LINKS_WRITE,
];
```

You can also subscribe to sanitized events:

```ts
const qredex = Qredex.init({
  auth: { clientId, clientSecret },
  onEvent(event) {
    if (event.type === "response") {
      console.log(event.method, event.path, event.status);
    }
  },
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

For advanced integrations, the SDK also exports:

- `QredexEnvironment`
- `QredexScope`
- `QredexHeader`
- `QredexErrorCode`

## Retry Behavior

- auth token issuance retries internally
- read retries are opt-in and apply only to `GET` and `HEAD`
- writes are not retried automatically
- use stable external IDs for order/refund replays instead of adding write retries blindly

```ts
const qredex = Qredex.init({
  auth: { clientId, clientSecret },
  readRetry: {
    maxAttempts: 2,
    baseDelayMs: 250,
    maxDelayMs: 1_000,
  },
});
```

## Error Handling

Use the typed guards when you want branch-safe error handling without `instanceof` chains:

```ts
import {
  Qredex,
  QredexErrorCode,
  isConflictError,
  isValidationError,
} from "@qredex/server";

try {
  await qredex.creators.create({
    handle: "alice",
  });
} catch (error) {
  if (isValidationError(error)) {
    console.error(error.errorCode, error.requestId);
  }

  if (isConflictError(error)) {
    if (error.errorCode === QredexErrorCode.REJECTED_CROSS_SOURCE_DUPLICATE) {
      console.error("Conflict needs business handling.");
    }
  }

  throw error;
}
```

## Canonical Flow

1. Create or fetch creators.
2. Create or fetch links.
3. Issue IIT where backend issuance is appropriate.
4. Lock PIT for authenticated machine flows when that is the canonical path.
5. Record the paid order.
6. Record refunds later with stable external refund IDs.

## Docs

- [Integration Guide](./docs/INTEGRATION_GUIDE.md)
- [Golden Path](./docs/GOLDEN_PATH.md)
- [Common Setups](./docs/SETUPS.md)
- [Error Handling](./docs/ERRORS.md)
- [Support Policy](./docs/SUPPORT_POLICY.md)
- [Contributing](./CONTRIBUTING.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security Policy](./SECURITY.md)
- [Release Guide](./docs/RELEASING.md)

## Examples

- [auth-and-create-creator.ts](./examples/auth-and-create-creator.ts)
- [create-link.ts](./examples/create-link.ts)
- [issue-iit.ts](./examples/issue-iit.ts)
- [list-orders.ts](./examples/list-orders.ts)
- [lock-pit.ts](./examples/lock-pit.ts)
- [get-order-details.ts](./examples/get-order-details.ts)
- [record-paid-order.ts](./examples/record-paid-order.ts)
- [record-refund.ts](./examples/record-refund.ts)

## Testing

- `npm test` runs unit tests and local mock-server HTTP integration tests only
- `npm run test:live` runs the opt-in live integration suite

Live tests are skipped unless `QREDEX_LIVE_ENABLED=1` and the required `QREDEX_LIVE_*` variables are set.

Start from [`.env.live.example`](./.env.live.example) when wiring live test credentials.

## License

[Apache-2.0](./LICENSE)
