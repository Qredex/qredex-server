# Integration Guide

## Scope

`qredex` is the canonical Node server SDK for authenticated Qredex integrations. It is intentionally limited to the Integrations API and machine-to-machine flows.

## Required Environment

- `QREDEX_CLIENT_ID`
- `QREDEX_CLIENT_SECRET`
- optional `QREDEX_SCOPE`
- optional `QREDEX_ENVIRONMENT`:
  - `production` (default)
  - `staging`
  - `development`

Application-specific values such as `QREDEX_STORE_ID` remain your responsibility for request payload assembly. `Qredex.bootstrap()` does not read them.

## 1. Create The Client

```ts
import { Qredex } from "@qredex/server";

export const qredex = Qredex.bootstrap();
```

`Qredex.bootstrap()` reads `QREDEX_CLIENT_ID`, `QREDEX_CLIENT_SECRET`, optional `QREDEX_SCOPE`, and optional `QREDEX_ENVIRONMENT`.

Use `QREDEX_SCOPE` when you want bootstrap to request explicit direct scopes.

## 2. Creator Setup

Create creators through `qredex.creators.create()`. Keep creator handles stable and merchant-scoped.

```ts
const creator = await qredex.creators.create({
  handle: "alice",
  display_name: "Alice",
});
```

## 3. Link Setup

Use `qredex.links.create()` with the correct `store_id` and a valid storefront `destination_path`.

```ts
const link = await qredex.links.create({
  store_id: process.env.QREDEX_STORE_ID!,
  creator_id: creator.id,
  link_name: "spring-launch",
  destination_path: "/products/spring-launch",
  attribution_window_days: 30,
  status: "ACTIVE",
});
```

## 4. IIT Issuance

Use `qredex.intents.issueInfluenceIntentToken()` only for authenticated backend click flows. IIT is click-time intent, not locked purchase truth.

```ts
const iit = await qredex.intents.issueInfluenceIntentToken({
  link_id: link.id,
  landing_path: "/products/spring-launch",
});
```

## 5. PIT Lock

Use `qredex.intents.lockPurchaseIntent()` for authenticated machine flows. PIT is the canonical locked attribution signal.

```ts
const pit = await qredex.intents.lockPurchaseIntent({
  token: iit.token,
  source: "backend-cart-lock",
  integrity_version: 2,
});
```

## 6. Paid Order Ingestion

Use stable order IDs. Include `purchase_intent_token` when a valid PIT exists.

```ts
const order = await qredex.orders.recordPaidOrder({
  store_id: process.env.QREDEX_STORE_ID!,
  external_order_id: "order-100045",
  order_number: "100045",
  currency: "USD",
  total_price: 110,
  purchase_intent_token: pit.token,
});
```

Do not collapse Qredex attribution fields into a generic success flag. Consume `resolution_status`, `token_integrity`, and `integrity_reason` directly.

## 7. Order Reads

Use `qredex.orders.list()` for machine-readable order attribution retrieval and `qredex.orders.getDetails(orderAttributionId)` for the full attribution record.

```ts
const orders = await qredex.orders.list({
  page: 0,
  size: 20,
});

const orderDetails = await qredex.orders.getDetails(orders.items[0]!.id);
```

## 8. Refund Ingestion

Use stable external refund IDs and accurate timestamps/totals.

```ts
const refund = await qredex.refunds.recordRefund({
  store_id: process.env.QREDEX_STORE_ID!,
  external_order_id: "order-100045",
  external_refund_id: "refund-100045-1",
  refund_total: 25,
});
```

## Operational Guidance

- Reuse stable external order and refund IDs on retries.
- Treat `INGESTED` and `IDEMPOTENT` as successful business acknowledgements when documented by Qredex policy.
- Treat `409` outcomes as policy/conflict rejections, not transport failures.
- Expect the SDK to reject obviously invalid request shapes locally before making a network call.
- Subscribe to `qredex.events` or use `onEvent` for sanitized request, auth, retry, and validation lifecycle visibility.
- Event hooks are best-effort and non-blocking, so observability does not sit on the request critical path.
- Auth retries happen internally for token issuance. Read retries are opt-in and only apply to `GET` and `HEAD`.
- For writes, prefer replaying stable `external_order_id` and `external_refund_id` over automatic retries.
- Never log `client_secret`, bearer tokens, IIT, or PIT in plaintext.
- Keep store scoping correct on every write.

## Boundary Reminder

This SDK does not cover:

- `/api/v1/merchant/**`
- `/api/v1/internal/**`
- Shopify OAuth/session exchange
- browser or agent runtime behavior
