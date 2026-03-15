# Qredex Node SDK Design Review

## Design Strengths

1. **Clear scope boundaries** - Integrations API only, no merchant/internal/browser drift
2. **Canonical naming preserved** - IIT, PIT, token_integrity, resolution_status stay intact
3. **Resource grouping is sound** - `creators`, `links`, `intents`, `orders`, `refunds` map to domain
4. **Error categories are appropriate** - covers auth, validation, conflict, rate limit, network
5. **Auth automation with observability** - token management is automatic but configurable
6. **Idempotency outcomes preserved** - `INGESTED`, `IDEMPOTENT`, `REJECTED_*` stay visible
7. **TypeScript-first with strict typing** - no `any`, explicit types on public surface

---

## Design Weaknesses

1. **Client construction is ambiguous** - `QredexClient.init()` vs `new QredexClient()` - pick one
2. **No pagination pattern defined** - list creators/links needs cursor or offset handling
3. **No retry/timeout configuration shape** - mentioned but not specified
4. **No idempotency key helper** - merchants need to safely retry without duplicates
5. **No middleware/interceptor pattern** - no way to add logging, metrics, request/response hooks
6. **Response objects not typed** - should be explicit result types, not inferred
7. **No environment/config profile support** - production vs sandbox switching
8. **List methods lack filter/sort types** - will drift without explicit contracts

---

## Recommended Patterns

### 1. Client Construction: **Simple Constructor with Config Object**

```ts
// Recommended
const client = new QredexClient({
  baseUrl: "https://api.qredex.com",
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID,
    clientSecret: process.env.QREDEX_CLIENT_SECRET,
  },
  // Optional
  timeout: 30000,
  retries: 3,
  environment: "production" | "sandbox",
});

// Avoid: fluent builders, static init factories
// QredexClient.init(), QredexClient.create().withAuth()... is overkill
```

**Why:** Server SDKs don't need complex builders. One config object, clear defaults.

---

### 2. Resource Grouping: **Namespace Properties (Current is Good)**

```ts
client.creators.create(...)
client.creators.get(id)
client.creators.list({ cursor, limit })

client.links.create(...)
client.links.get(id)
client.links.list({ cursor, limit })

client.intents.issueInfluenceIntentToken(...)
client.intents.lockPurchaseIntent(...)

client.orders.recordPaidOrder(...)
client.refunds.recordRefund(...)
```

**Why:** Matches domain boundaries, easy to discover, aligns with API zoning.

---

### 3. Method Naming: **Verb-First, Domain-Accurate**

| Operation | Recommended | Avoid |
|-----------|-------------|-------|
| Create creator | `create()` | `createCreator()` |
| Get creator | `get(id)` | `getCreator(id)` |
| List creators | `list(options)` | `getCreators()` |
| Issue IIT | `issueInfluenceIntentToken()` | `createIIT()`, `generateToken()` |
| Lock PIT | `lockPurchaseIntent()` | `lockPIT()`, `finalizeToken()` |
| Record paid order | `recordPaidOrder()` | `submitOrder()`, `markPaid()` |
| Record refund | `recordRefund()` | `refundOrder()`, `createRefund()` |

**Why:** Within a namespace, `create()` is unambiguous. Full names on intents/orders/refunds preserve domain clarity.

---

### 4. Request/Response Modeling: **Typed Request Objects, Typed Result Classes**

```ts
// Request types - explicit, named
interface CreateCreatorRequest {
  externalId: string;
  displayName?: string;
  metadata?: Record<string, string>;
}

interface ListCreatorsRequest {
  cursor?: string;
  limit?: number;
  status?: "active" | "inactive";
}

// Response types - preserve all Qredex fields
interface CreateCreatorResult {
  creatorId: string;
  externalId: string;
  displayName: string | null;
  status: "active" | "inactive";
  createdAt: string; // ISO 8601
}

interface IssueInfluenceIntentTokenResult {
  intentToken: string; // The IIT
  expiresAt: string;
  // Do not flatten - preserve canonical fields
  resolutionStatus: "pending" | "resolved";
  tokenIntegrity: "valid" | "compromised";
  integrityReason?: string;
}

// Usage
const result = await client.intents.issueInfluenceIntentToken({
  creatorId: "cre_123",
  orderId: "ord_456",
});
console.log(result.resolutionStatus); // explicit, not a boolean
```

**Why:** Typed results prevent accidental field loss. Preserves Qredex contract details.

---

### 5. Error Handling: **Typed Errors with Full Context**

```ts
import { QredexClient, AuthenticationError, ConflictError, RateLimitError } from "@qredex/sdk";

try {
  await client.creators.create({ externalId: "ext_123" });
} catch (error) {
  if (error instanceof AuthenticationError) {
    // error.statusCode === 401
    // error.errorCode === "INVALID_CREDENTIALS"
    // error.requestId
  }
  if (error instanceof ConflictError) {
    // error.statusCode === 409
    // error.errorCode === "CREATOR_EXISTS"
    // error.details // full response body
  }
  if (error instanceof RateLimitError) {
    // error.statusCode === 429
    // error.retryAfter // seconds
    // error.resetTime // Date
  }
  throw error;
}
```

**Error class structure:**
```ts
abstract class QredexError extends Error {
  abstract statusCode: number;
  abstract errorCode: string;
  requestId?: string;
  responseBody?: unknown;
}

class AuthenticationError extends QredexError {
  statusCode = 401;
  errorCode: "INVALID_CREDENTIALS" | "TOKEN_EXPIRED" | "INVALID_TOKEN";
}

class ValidationError extends QredexError {
  statusCode = 400;
  errorCode: "INVALID_REQUEST" | "MISSING_FIELD" | "INVALID_FIELD_VALUE";
  fieldErrors?: Array<{ field: string; message: string }>;
}

class ConflictError extends QredexError {
  statusCode = 409;
  errorCode: "CREATOR_EXISTS" | "LINK_EXISTS" | "DUPLICATE_ORDER";
}

class RateLimitError extends QredexError {
  statusCode = 429;
  errorCode = "RATE_LIMIT_EXCEEDED";
  retryAfter: number;
  resetTime: Date;
}
```

**Why:** Preserves Qredex error codes, enables precise handling, debuggable.

---

### 6. Idempotency Handling: **Explicit Idempotency Key Helper**

```ts
// Pattern 1: SDK generates idempotency key
const result = await client.orders.recordPaidOrder({
  orderId: "ord_123",
  amount: 5000,
  currency: "SEK",
  idempotencyKey: client.idempotencyKey(), // UUID v4
});

// Pattern 2: Caller provides (for replay safety)
const idemKey = client.idempotencyKey({ prefix: "order-paid", unique: orderId });
await client.orders.recordPaidOrder({ ... }, { idempotencyKey: idemKey });

// Avoid: hiding idempotency entirely - merchants need to understand retry semantics
```

**Why:** Idempotency is a platform contract. SDK should make it easy, not invisible.

---

### 7. Pagination: **Cursor-Based Iterator Pattern**

```ts
// Simple: manual cursor
let cursor: string | undefined;
do {
  const page = await client.creators.list({ cursor, limit: 50 });
  for (const creator of page.data) {
    // process
  }
  cursor = page.nextCursor;
} while (cursor);

// Better: async iterator
for await (const creator of client.creators.listAll({ limit: 50 })) {
  // auto-paginates
}
```

**Why:** Cursor pagination is standard for scalable APIs. Iterator is ergonomic for full scans.

---

### 8. Retry/Timeout: **Configurable Defaults with Per-Call Override**

```ts
// Client-level defaults
const client = new QredexClient({
  baseUrl: "...",
  auth: { ... },
  timeout: 30000, // ms
  retries: 3,
  retryDelay: 1000, // base delay, exponential backoff
});

// Per-call override
await client.creators.create({ ... }, {
  timeout: 5000,
  retries: 0, // no retry for this call
});

// Retry only on: 429, 500-599, network errors
// Do not retry: 400, 401, 403, 404, 409 (unless idempotent)
```

**Why:** Defaults work for most. Override for special cases. Clear retry policy.

---

### 9. Middleware/Interceptor: **Request/Response Hooks**

```ts
// Optional but valuable for enterprise
client.use({
  onRequest: (request) => {
    // Add custom headers, log request
    request.headers["X-Custom-Trace"] = generateTraceId();
  },
  onResponse: (response) => {
    // Log response, collect metrics
    metrics.recordLatency(response.duration);
  },
  onError: (error) => {
    // Centralized error logging
    logger.error("SDK error", { error });
  },
});
```

**Why:** Enables observability, custom auth, request tracing without SDK modification.

---

### 10. Environment/Profile: **Predefined Configurations**

```ts
// Option 1: explicit URL
const client = new QredexClient({
  baseUrl: "https://api.qredex.com", // or sandbox URL
  auth: { ... },
});

// Option 2: environment preset
const client = new QredexClient({
  environment: "production", // | "sandbox"
  auth: { ... },
});

// Option 3: from env vars (convenience, not magic)
const client = QredexClient.fromEnv();
// reads QREDEX_BASE_URL, QREDEX_CLIENT_ID, QREDEX_CLIENT_SECRET
```

**Why:** Merchants have sandbox + production. Make switching easy and explicit.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why Avoid |
|--------------|-----------|
| `any` in public types | Loses type safety, defeats TypeScript |
| `success: boolean` on responses | Hides canonical `resolution_status`, `token_integrity` |
| Auto-retry on 409 conflicts | Conflicts need explicit handling, not silent retry |
| Swallowing `error_code` | Merchants need Qredex error codes for handling |
| Logging tokens/secrets | Security violation |
| Fluent builder overkill | `new QredexClient().withAuth().withTimeout()...` is verbose |
| Generic error types | `Error` or `AxiosError` leaks transport details |
| Positional arguments | `create(name, email, metadata)` - fragile, unreadable |
| Hidden pagination | Returning only first page without cursor access |
| Magic env var reliance | Explicit config > implicit env reading |

---

## Exact API Shape Suggestions

### Exports from `@qredex/sdk`

```ts
// Main client
export { QredexClient } from "./client/QredexClient";

// Resources (for type annotations)
export type { Creators } from "./resources/Creators";
export type { Links } from "./resources/Links";
export type { Intents } from "./resources/Intents";
export type { Orders } from "./resources/Orders";
export type { Refunds } from "./resources/Refunds";

// Errors
export {
  QredexError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  ConflictError,
  RateLimitError,
  ApiError,
  NetworkError,
} from "./errors";

// Types (for request/response annotations)
export type {
  CreateCreatorRequest,
  CreateCreatorResult,
  GetCreatorResult,
  ListCreatorsRequest,
  ListCreatorsResult,
  // ... etc for all resources
} from "./types";

// Optional utilities
export { generateIdempotencyKey } from "./utils/idempotency";
```

### Usage Example (Complete)

```ts
import {
  QredexClient,
  AuthenticationError,
  ConflictError,
  RateLimitError,
  type CreateCreatorRequest,
} from "@qredex/sdk";

const client = new QredexClient({
  environment: "sandbox",
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
  },
  timeout: 30000,
  retries: 3,
});

async function onboardCreator(externalId: string) {
  const request: CreateCreatorRequest = {
    externalId,
    displayName: `Creator ${externalId}`,
  };

  try {
    const creator = await client.creators.create(request);
    console.log(`Created creator: ${creator.creatorId}`);
    return creator;
  } catch (error) {
    if (error instanceof ConflictError) {
      // Creator already exists - fetch instead
      console.log(`Creator ${externalId} already exists, fetching...`);
      // Handle appropriately
    }
    if (error instanceof RateLimitError) {
      console.log(`Rate limited, retry after ${error.retryAfter}s`);
    }
    throw error;
  }
}
```

---

## Final Recommendation

### The Durable SDK Design

```ts
import { QredexClient } from "@qredex/sdk";

// 1. Simple construction
const client = new QredexClient({
  environment: "sandbox", // or "production"
  auth: { clientId, clientSecret },
  timeout: 30000,
  retries: 3,
});

// 2. Resource namespaces
await client.creators.create({ externalId: "ext_123" });
await client.links.create({ creatorId: "cre_123", type: "affiliate" });
await client.intents.issueInfluenceIntentToken({ creatorId, linkId });
await client.intents.lockPurchaseIntent({ intentToken, customerId });
await client.orders.recordPaidOrder({ orderId, amount, currency, idempotencyKey });
await client.refunds.recordRefund({ orderId, amount, reason });

// 3. Typed results with canonical fields
const result = await client.intents.issueInfluenceIntentToken({ ... });
if (result.resolutionStatus === "resolved" && result.tokenIntegrity === "valid") {
  // proceed
}

// 4. Typed errors with Qredex error codes
try {
  await client.creators.create({ ... });
} catch (error) {
  if (error instanceof ConflictError && error.errorCode === "CREATOR_EXISTS") {
    // handle
  }
}

// 5. Pagination with cursor
for await (const creator of client.creators.listAll({ limit: 50 })) {
  // auto-paginates
}

// 6. Idempotency explicit but easy
await client.orders.recordPaidOrder({
  orderId: "ord_123",
  amount: 5000,
  currency: "SEK",
  idempotencyKey: client.idempotencyKey(),
});
```

### What Makes This Design Infrastructure-Grade

1. **Explicit over magical** - No hidden behavior, all config is visible
2. **Typed end-to-end** - Request and response types preserve Qredex contract
3. **Error codes preserved** - `error_code` is accessible, not swallowed
4. **Idempotency is a first-class concern** - Helpers provided, not hidden
5. **Pagination is ergonomic** - Iterator for scans, cursor for control
6. **Retry is configurable and bounded** - Clear policy, per-call override
7. **No transport leakage** - No `axios`, `fetch`, or HTTP primitives in public API
8. **Canonical naming intact** - IIT, PIT, resolution_status, token_integrity preserved
9. **Security by default** - No logging of secrets, redacted debug output
10. **Small public surface** - Only what merchants need, internal helpers unexported

---

## Summary Table

| Aspect | Recommended Pattern |
|--------|---------------------|
| Construction | `new QredexClient({ ... })` |
| Namespaces | `client.creators`, `client.links`, etc. |
| Methods | `create()`, `get(id)`, `list(options)` |
| Requests | Typed interfaces, named properties |
| Responses | Typed classes with all Qredex fields |
| Errors | Typed hierarchy, preserves `error_code` |
| Idempotency | `client.idempotencyKey()` helper |
| Pagination | Cursor + `listAll()` async iterator |
| Retry/Timeout | Configurable defaults, per-call override |
| Middleware | Optional `client.use({ onRequest, onResponse })` |
| Environment | `environment: "sandbox" \| "production"` or `fromEnv()` |

This design is **solid, intuitive, easy to use correctly, hard to misuse, and consistent with Qredex platform discipline**.
