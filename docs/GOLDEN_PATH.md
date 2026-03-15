# Golden Path

## Goal

This is the practical Qredex machine-integration path for merchants using `@qredex/node`.

The canonical sequence is:

1. authenticate
2. create or fetch a creator
3. create or fetch a link
4. issue IIT
5. lock PIT
6. record the paid order
7. record any refund later

This flow is designed to preserve Qredex attribution semantics and reduce integration mistakes.

## 1. Create The Client

```ts
import { QredexClient } from "@qredex/node";

export const client = QredexClient.init({
  environment: "production",
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
  },
});
```

## 2. Create Or Fetch The Creator

Use a stable creator handle for the merchant-scoped creator identity.

```ts
const creator = await client.creators.create({
  handle: "alice",
  display_name: "Alice Example",
});
```

If the creator may already exist, handle `409` explicitly and fetch the canonical record instead of retrying blindly.

## 3. Create The Link

Use the correct `store_id` and a real storefront destination path.

```ts
const link = await client.links.create({
  store_id: process.env.QREDEX_STORE_ID!,
  creator_id: creator.id,
  link_name: "spring-launch",
  destination_path: "/products/spring-launch",
  attribution_window_days: 30,
  status: "ACTIVE",
});
```

## 4. Issue IIT

Issue IIT for authenticated backend click flows.

```ts
const iit = await client.intents.issueInfluenceIntentToken({
  link_id: link.id,
  landing_path: "/products/spring-launch",
});
```

IIT is click-time intent. It is not the final locked purchase signal.

## 5. Lock PIT

Lock PIT for the machine flow that represents purchase intent.

```ts
const pit = await client.intents.lockPurchaseIntent({
  token: iit.token,
  source: "backend-cart-lock",
  integrity_version: 2,
});
```

PIT is the canonical locked attribution token.

## 6. Record The Paid Order

Use a stable merchant order identifier and attach the PIT token when available.

```ts
const order = await client.orders.recordPaidOrder({
  store_id: process.env.QREDEX_STORE_ID!,
  external_order_id: "order-100045",
  order_number: "100045",
  currency: "USD",
  total_price: 110,
  purchase_intent_token: pit.token,
});
```

Consume attribution facts directly from the response:

- `resolution_status`
- `token_integrity`
- `integrity_reason`

Do not flatten these into a generic success boolean.

## 7. Record Refunds Later

Refunds should use a stable external refund identifier and reference the original external order ID.

```ts
const refund = await client.refunds.recordRefund({
  store_id: process.env.QREDEX_STORE_ID!,
  external_order_id: "order-100045",
  external_refund_id: "refund-100045-1",
  refund_total: 25,
});
```

## Common Failure Cases

### Validation Failure

Cause:

- malformed UUID
- invalid destination path
- missing required order or refund identifiers

Behavior:

- the SDK may fail fast locally with `ValidationError`
- the API may also return `400 ValidationError`

Action:

- fix the request shape
- do not retry unchanged input

### Authentication Failure

Cause:

- invalid client credentials
- expired or invalid static access token

Behavior:

- `AuthenticationError`

Action:

- verify credentials and direct scopes
- do not treat this as a transient retry case

### Conflict Or Policy Rejection

Cause:

- duplicate or rejected ingest
- creator/link conflicts
- order/refund policy conflict

Behavior:

- `ConflictError`

Action:

- inspect `errorCode`
- treat the outcome as a business/policy signal, not a transport failure
- do not blindly retry `409`

### Retryable Read Failure

Cause:

- temporary network issue
- `429`
- `5xx`

Behavior:

- reads can be retried only if `readRetry` is configured

Action:

- keep automatic retries limited to reads
- keep writes explicit and merchant-controlled

## Operational Recommendations

- keep `external_order_id` stable on replays
- keep `external_refund_id` stable on replays
- do not log `client_secret`, bearer tokens, IIT, or PIT
- use `onEvent` or `client.events` for sanitized request and retry visibility
- validate the full flow in staging before production rollout

## What Not To Do

- do not use this SDK for `/api/v1/merchant/**`
- do not use this SDK for `/api/v1/internal/**`
- do not build parallel non-canonical attribution flows around it
- do not hide `resolution_status`, `token_integrity`, or `integrity_reason` from downstream business logic
