# Common Setups

These are practical ways teams commonly wire `qredex` into backend services.

## Creator And Link Management Service

Use this when a backend service is responsible for merchant onboarding, creator creation, and link provisioning.

```ts
import { Qredex, QredexScope } from "qredex";

export const qredex = Qredex.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: [
      QredexScope.CREATORS_WRITE,
      QredexScope.LINKS_WRITE,
    ],
  },
});
```

## Checkout And Order Attribution Service

Use this when a backend service issues IIT, locks PIT, and records paid orders.

```ts
import { Qredex, QredexScope } from "qredex";

export const qredex = Qredex.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: [
      QredexScope.INTENTS_WRITE,
      QredexScope.ORDERS_WRITE,
    ],
  },
});
```

## Refund Reconciliation Worker

Use this when refunds are recorded by a back-office process or scheduled worker.

```ts
import { Qredex, QredexScope } from "qredex";

export const qredex = Qredex.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: [QredexScope.ORDERS_WRITE],
  },
});
```

## Shared Service Defaults

If several internal services share the same Qredex auth and environment, keep one shared config object and initialize from it explicitly.

```ts
import { Qredex, QredexEnvironment, QredexScope } from "qredex";

const sharedQredexConfig = {
  environment: QredexEnvironment.STAGING,
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: [
      QredexScope.CREATORS_WRITE,
      QredexScope.LINKS_WRITE,
    ],
  },
} as const;

export const qredex = Qredex.init(sharedQredexConfig);
```
