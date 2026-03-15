# Integration Guide

## Scope

`@qredex/node` is the canonical Node server SDK for authenticated Qredex integrations. It is intentionally limited to the Integrations API and machine-to-machine flows.

## Required Environment

- `QREDEX_CLIENT_ID`
- `QREDEX_CLIENT_SECRET`
- `QREDEX_STORE_ID` for link/order/refund calls
- optional `QREDEX_ENVIRONMENT`:
  - `production` (default)
  - `staging`
  - `development`

## 1. Create The Client

```ts
import { Qredex } from "@qredex/node";

export const client = Qredex.init({
  environment:
    process.env.QREDEX_ENVIRONMENT === "staging"
      ? "staging"
      : process.env.QREDEX_ENVIRONMENT === "development"
        ? "development"
        : "production",
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
  },
});
```

Canonical host presets are built in:

- `production` -> `https://api.qredex.com`
- `staging` -> `https://staging-api.qredex.com`
- `development` -> `http://localhost:8080`

Use `baseUrl` only as an internal/testing override with `environment: "staging"` or `environment: "development"`. Production should always resolve from the built-in environment preset.

## 2. Creator Setup

Create creators through `client.creators.create()`. Keep creator handles stable and merchant-scoped.

```ts
const creator = await client.creators.create({
  handle: "alice",
  display_name: "Alice",
});
```

## 3. Link Setup

Use `client.links.create()` with the correct `store_id` and a valid storefront `destination_path`.

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

## 4. IIT Issuance

Use `client.intents.issueInfluenceIntentToken()` only for authenticated backend click flows. IIT is click-time intent, not locked purchase truth.

```ts
const iit = await client.intents.issueInfluenceIntentToken({
  link_id: link.id,
  landing_path: "/products/spring-launch",
});
```

## 5. PIT Lock

Use `client.intents.lockPurchaseIntent()` for authenticated machine flows. PIT is the canonical locked attribution signal.

```ts
const pit = await client.intents.lockPurchaseIntent({
  token: iit.token,
  source: "backend-cart-lock",
  integrity_version: 2,
});
```

## 6. Paid Order Ingestion

Use stable order IDs. Include `purchase_intent_token` when a valid PIT exists.

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

Do not collapse Qredex attribution fields into a generic success flag. Consume `resolution_status`, `token_integrity`, and `integrity_reason` directly.

## 7. Refund Ingestion

Use stable external refund IDs and accurate timestamps/totals.

```ts
const refund = await client.refunds.recordRefund({
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
- Subscribe to `client.events` or use `onEvent` for sanitized request, auth, retry, and validation lifecycle visibility.
- Auth retries happen internally for token issuance. Read retries are opt-in and only apply to `GET` and `HEAD`.
- Never log `client_secret`, bearer tokens, IIT, or PIT in plaintext.
- Keep store scoping correct on every write.

## Boundary Reminder

This SDK does not cover:

- `/api/v1/merchant/**`
- `/api/v1/internal/**`
- Shopify OAuth/session exchange
- browser or agent runtime behavior
