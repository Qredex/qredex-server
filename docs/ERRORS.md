# Errors

`qredex` normalizes Qredex failures into a small typed hierarchy.

## Error Classes

- `AuthenticationError`
  Returned for `401` responses, including auth token issuance failures.
- `AuthorizationError`
  Returned for `403` responses when the client lacks the required direct scope.
- `ValidationError`
  Returned for `400` request validation failures.
- `ConflictError`
  Returned for `409` policy/conflict outcomes such as cross-source duplicate rejection.
- `RateLimitError`
  Returned for `429` responses. Preserves `retryAfterSeconds` when available.
- `ApiError`
  Returned for all other non-success HTTP responses.
- `NetworkError`
  Returned for transport failures and request timeouts.
- `ConfigurationError`
  Returned for invalid SDK setup, such as trying to issue tokens without client credentials auth configured.

## Preserved Metadata

Every `QredexError` may include:

- `status`
- `errorCode`
- `message`
- `requestId`
- `traceId`
- `responseBody`
- `responseText`

## Example

```ts
import { Qredex, QredexErrorCode, isConflictError } from "qredex";

try {
  await qredex.refunds.recordRefund({
    store_id,
    external_order_id: "order-100045",
    external_refund_id: "refund-100045-1",
  });
} catch (error) {
  if (isConflictError(error)) {
    console.error(error.status, error.errorCode, error.requestId);

    if (error.errorCode === QredexErrorCode.REJECTED_CROSS_SOURCE_DUPLICATE) {
      console.error("Handle the business conflict explicitly.");
    }
  }

  throw error;
}
```

## Helper Guards

The SDK also exports:

- `isApiError`
- `isAuthenticationError`
- `isAuthorizationError`
- `isValidationError`
- `isConflictError`
- `isRateLimitError`
- `isNetworkError`
- `isConfigurationError`

Use these when you want narrow error handling without relying on `instanceof` checks in every integration layer.

## Common Error Code Constants

The SDK also exports `QredexErrorCode` for common machine-handled values:

- `INVALID_CLIENT`
- `VALIDATION_ERROR`
- `RATE_LIMITED`
- `INTERNAL_ERROR`
- `REJECTED_CROSS_SOURCE_DUPLICATE`

This list is intentionally small and not guaranteed to be exhaustive for every possible platform response.

## Request And Trace IDs

When Qredex returns request or trace identifiers in headers, the SDK surfaces them on the thrown error object. You can also pass request-scoped IDs into any operation with `QredexCallOptions`:

```ts
await qredex.orders.recordPaidOrder(
  {
    store_id,
    external_order_id: "order-100045",
    currency: "USD",
  },
  {
    requestId: "merchant-order-100045",
    traceId: "trace-123",
  },
);
```

## Logging Safety

The SDK never logs secrets, bearer tokens, IITs, or PITs by default. If you attach a custom logger, keep the same discipline in downstream log sinks.
