import { describe, expect, it } from "vitest";

import {
  ApiError,
  AuthenticationError,
  ConflictError,
  NetworkError,
  QredexClient,
  ValidationError as QredexValidationError,
  ValidationError,
} from "../src";
import {
  createFetchMock,
  getBodyText,
  getHeader,
  getJsonBody,
  jsonResponse,
  textResponse,
} from "./helpers";

const UUIDS = {
  creator: "11111111-1111-4111-8111-111111111111",
  link: "22222222-2222-4222-8222-222222222222",
  merchant: "33333333-3333-4333-8333-333333333333",
  store: "44444444-4444-4444-8444-444444444444",
};

describe("QredexClient", () => {
  it("issues tokens with client credentials and reuses the cached token for creator writes", async () => {
    const { calls, fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token-1",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "direct:creators:write",
      }),
      jsonResponse(201, {
        id: UUIDS.creator,
        handle: "alice",
        status: "ACTIVE",
        display_name: "Alice",
        created_at: "2026-03-15T10:00:00Z",
        updated_at: "2026-03-15T10:00:00Z",
      }),
    ]);

    const client = QredexClient.init({
      baseUrl: "https://api.qredex.test",
      auth: {
        clientId: "client-123",
        clientSecret: "secret-456",
        scope: ["direct:creators:write"],
      },
      fetch,
    });

    const token = await client.auth.issueToken();
    const creator = await client.creators.create({
      handle: "alice",
      display_name: "Alice",
    });

    expect(token.access_token).toBe("token-1");
    expect(creator.handle).toBe("alice");
    expect(calls).toHaveLength(2);
    expect(String(calls[0]!.input)).toBe("https://api.qredex.test/api/v1/auth/token");
    expect(getHeader(calls[0]!, "authorization")).toBe("Basic Y2xpZW50LTEyMzpzZWNyZXQtNDU2");
    expect(getHeader(calls[0]!, "content-type")).toBe("application/x-www-form-urlencoded");
    expect(getBodyText(calls[0]!)).toBe(
      "grant_type=client_credentials&scope=direct%3Acreators%3Awrite",
    );
    expect(String(calls[1]!.input)).toBe("https://api.qredex.test/api/v1/integrations/creators");
    expect(getHeader(calls[1]!, "authorization")).toBe("Bearer token-1");
    expect(getJsonBody<{ handle: string }>(calls[1]!).handle).toBe("alice");
  });

  it("supports the canonical integrations flow across creators, links, intents, orders, and refunds", async () => {
    const { calls, fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token-flow",
        token_type: "Bearer",
        expires_in: 3600,
      }),
      jsonResponse(201, {
        id: UUIDS.creator,
        handle: "alice",
        status: "ACTIVE",
        created_at: "2026-03-15T10:00:00Z",
        updated_at: "2026-03-15T10:00:00Z",
      }),
      jsonResponse(200, {
        id: UUIDS.creator,
        handle: "alice",
        status: "ACTIVE",
        created_at: "2026-03-15T10:00:00Z",
        updated_at: "2026-03-15T10:00:00Z",
      }),
      jsonResponse(200, {
        items: [
          {
            id: UUIDS.creator,
            handle: "alice",
            status: "ACTIVE",
            created_at: "2026-03-15T10:00:00Z",
            updated_at: "2026-03-15T10:00:00Z",
            links_count: 1,
            orders_count: 0,
            revenue_total: 0,
          },
        ],
        page: 0,
        size: 20,
        total_elements: 1,
        total_pages: 1,
      }),
      jsonResponse(201, {
        id: UUIDS.link,
        merchant_id: UUIDS.merchant,
        store_id: UUIDS.store,
        creator_id: UUIDS.creator,
        link_name: "spring-launch",
        link_code: "ABCDE",
        public_link_url: "https://qredex.test/demo/alice/ABCDE",
        destination_path: "/products/spring-launch",
        status: "ACTIVE",
        attribution_window_days: 30,
        created_at: "2026-03-15T10:01:00Z",
        updated_at: "2026-03-15T10:01:00Z",
      }),
      jsonResponse(200, {
        id: UUIDS.link,
        merchant_id: UUIDS.merchant,
        store_id: UUIDS.store,
        creator_id: UUIDS.creator,
        link_name: "spring-launch",
        link_code: "ABCDE",
        public_link_url: "https://qredex.test/demo/alice/ABCDE",
        destination_path: "/products/spring-launch",
        status: "ACTIVE",
        attribution_window_days: 30,
        created_at: "2026-03-15T10:01:00Z",
        updated_at: "2026-03-15T10:01:00Z",
      }),
      jsonResponse(200, {
        items: [
          {
            id: UUIDS.link,
            store_id: UUIDS.store,
            link_name: "spring-launch",
            link_code: "ABCDE",
            destination_path: "/products/spring-launch",
            status: "ACTIVE",
            attribution_window_days: 30,
            created_at: "2026-03-15T10:01:00Z",
            updated_at: "2026-03-15T10:01:00Z",
            creator_id: UUIDS.creator,
            creator_handle: "alice",
          },
        ],
        page: 1,
        size: 10,
        total_elements: 1,
        total_pages: 1,
      }),
      jsonResponse(201, {
        id: "iit-1",
        merchant_id: UUIDS.merchant,
        link_id: UUIDS.link,
        token: "iit-token",
        token_id: "token-1",
        issued_at: "2026-03-15T10:02:00Z",
        expires_at: "2026-03-16T10:02:00Z",
        status: "ACTIVE",
        integrity_version: 2,
      }),
      jsonResponse(201, {
        id: "pit-1",
        merchant_id: UUIDS.merchant,
        store_id: UUIDS.store,
        link_id: UUIDS.link,
        token: "pit-token",
        token_id: "token-2",
        source: "browser-cart",
        origin_match_status: "MATCH",
        window_status: "WITHIN",
        attribution_window_days_snapshot: 30,
        store_domain_snapshot: "demo-store.example",
        issued_at: "2026-03-15T10:02:00Z",
        expires_at: "2026-03-16T10:02:00Z",
        locked_at: "2026-03-15T10:03:00Z",
        integrity_version: 2,
        eligible: true,
      }),
      jsonResponse(201, {
        id: "order-attr-1",
        merchant_id: UUIDS.merchant,
        order_source: "DIRECT_API",
        external_order_id: "order-1001",
        currency: "USD",
        duplicate_suspect: false,
        integrity_score: 90,
        integrity_band: "HIGH",
        review_required: false,
        resolution_status: "ATTRIBUTED",
        created_at: "2026-03-15T10:04:00Z",
        updated_at: "2026-03-15T10:04:00Z",
      }),
      jsonResponse(201, {
        id: "order-attr-1",
        merchant_id: UUIDS.merchant,
        order_source: "DIRECT_API",
        external_order_id: "order-1001",
        currency: "USD",
        duplicate_suspect: false,
        integrity_score: 90,
        integrity_band: "HIGH",
        review_required: false,
        resolution_status: "ATTRIBUTED",
        created_at: "2026-03-15T10:05:00Z",
        updated_at: "2026-03-15T10:05:00Z",
      }),
    ]);

    const client = QredexClient.init({
      baseUrl: "https://api.qredex.test",
      auth: {
        clientId: "client",
        clientSecret: "secret",
        retry: {
          maxAttempts: 1,
        },
      },
      fetch,
    });

    await client.creators.create({ handle: "alice" });
    await client.creators.get({ creator_id: UUIDS.creator });
    await client.creators.list({ status: "ACTIVE" });
    await client.links.create({
      store_id: UUIDS.store,
      creator_id: UUIDS.creator,
      link_name: "spring-launch",
      destination_path: "/products/spring-launch",
    });
    await client.links.get({ link_id: UUIDS.link });
    await client.links.list({
      page: 1,
      size: 10,
      status: "ACTIVE",
      destination: "/products/spring-launch",
      expired: false,
    });
    await client.intents.issueInfluenceIntentToken({ link_id: UUIDS.link });
    await client.intents.lockPurchaseIntent({
      token: "iit-token",
      source: "browser-cart",
      integrity_version: 2,
    });
    await client.orders.recordPaidOrder({
      store_id: UUIDS.store,
      external_order_id: "order-1001",
      currency: "USD",
      purchase_intent_token: "pit-token",
    });
    await client.refunds.recordRefund({
      store_id: UUIDS.store,
      external_order_id: "order-1001",
      external_refund_id: "refund-1",
      refund_total: 25,
    });

    expect(calls).toHaveLength(11);
    expect(String(calls[0]!.input)).toBe("https://api.qredex.test/api/v1/auth/token");
    expect(String(calls[2]!.input)).toBe(`https://api.qredex.test/api/v1/integrations/creators/${UUIDS.creator}`);
    expect(String(calls[3]!.input)).toBe(
      "https://api.qredex.test/api/v1/integrations/creators?status=ACTIVE",
    );
    expect(String(calls[5]!.input)).toBe(`https://api.qredex.test/api/v1/integrations/links/${UUIDS.link}`);
    expect(String(calls[6]!.input)).toBe(
      "https://api.qredex.test/api/v1/integrations/links?page=1&size=10&status=ACTIVE&destination=%2Fproducts%2Fspring-launch&expired=false",
    );
    expect(String(calls[7]!.input)).toBe("https://api.qredex.test/api/v1/integrations/intents/token");
    expect(String(calls[8]!.input)).toBe("https://api.qredex.test/api/v1/integrations/intents/lock");
    expect(String(calls[9]!.input)).toBe("https://api.qredex.test/api/v1/integrations/orders/paid");
    expect(String(calls[10]!.input)).toBe("https://api.qredex.test/api/v1/integrations/orders/refund");

    for (const call of calls.slice(1)) {
      expect(getHeader(call, "authorization")).toBe("Bearer token-flow");
    }
  });

  it("maps 400 validation responses into ValidationError with Qredex metadata", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token-validation",
        token_type: "Bearer",
        expires_in: 3600,
      }),
      jsonResponse(
        400,
        {
          error_code: "validation_error",
          message: "currency is required",
        },
        {
          "x-request-id": "req-123",
          "x-trace-id": "trace-456",
        },
      ),
    ]);

    const client = QredexClient.init({
      baseUrl: "https://api.qredex.test",
      auth: {
        clientId: "client",
        clientSecret: "secret",
        retry: {
          maxAttempts: 1,
        },
      },
      fetch,
    });

    const error = await client.orders
      .recordPaidOrder({
        store_id: UUIDS.store,
        external_order_id: "order-1001",
        currency: "USD",
      })
      .catch((thrown) => thrown);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.status).toBe(400);
    expect(error.errorCode).toBe("validation_error");
    expect(error.message).toBe("currency is required");
    expect(error.requestId).toBe("req-123");
    expect(error.traceId).toBe("trace-456");
  });

  it("maps auth endpoint failures into AuthenticationError", async () => {
    const { calls, fetch } = createFetchMock([
      jsonResponse(401, {
        error_code: "invalid_client",
        message: "client credentials rejected",
      }),
    ]);

    const client = QredexClient.init({
      baseUrl: "https://api.qredex.test",
      auth: {
        clientId: "bad-client",
        clientSecret: "bad-secret",
      },
      fetch,
    });

    const error = await client.links
      .create({
        store_id: UUIDS.store,
        creator_id: UUIDS.creator,
        link_name: "demo",
        destination_path: "/products/demo",
      })
      .catch((thrown) => thrown);

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.errorCode).toBe("invalid_client");
    expect(calls).toHaveLength(1);
  });

  it("maps 409 order/refund conflicts into ConflictError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token-conflict",
        token_type: "Bearer",
        expires_in: 3600,
      }),
      jsonResponse(409, {
        error_code: "REJECTED_CROSS_SOURCE_DUPLICATE",
        message: "refund rejected by duplicate policy",
      }),
    ]);

    const client = QredexClient.init({
      baseUrl: "https://api.qredex.test",
      auth: {
        clientId: "client",
        clientSecret: "secret",
        retry: {
          maxAttempts: 1,
        },
      },
      fetch,
    });

    const error = await client.refunds
      .recordRefund({
        store_id: UUIDS.store,
        external_order_id: "order-1001",
        external_refund_id: "refund-1",
      })
      .catch((thrown) => thrown);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.status).toBe(409);
    expect(error.errorCode).toBe("REJECTED_CROSS_SOURCE_DUPLICATE");
  });

  it("preserves non-JSON API failures and request identifiers", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token-api-error",
        token_type: "Bearer",
        expires_in: 3600,
      }),
      textResponse(
        500,
        "upstream exploded",
        {
          "x-request-id": "req-500",
          "traceparent": "00-trace-span-01",
        },
      ),
    ]);

    const client = QredexClient.init({
      baseUrl: "https://api.qredex.test",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.links
      .get({ link_id: UUIDS.link })
      .catch((thrown) => thrown);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe("Internal Server Error");
    expect(error.responseText).toBe("upstream exploded");
    expect(error.requestId).toBe("req-500");
    expect(error.traceId).toBe("00-trace-span-01");
  });

  it("surfaces transport failures as NetworkError", async () => {
    const { fetch } = createFetchMock([
      new TypeError("fetch failed"),
    ]);

    const client = QredexClient.init({
      baseUrl: "https://api.qredex.test",
      auth: {
        clientId: "client",
        clientSecret: "secret",
        retry: {
          maxAttempts: 1,
        },
      },
      fetch,
    });

    const error = await client.auth.issueToken().catch((thrown) => thrown);

    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe("fetch failed");
  });

  it("supports static access token auth without calling the auth endpoint", async () => {
    const { calls, fetch } = createFetchMock([
      jsonResponse(200, {
        items: [],
        page: 0,
        size: 20,
        total_elements: 0,
        total_pages: 0,
      }),
    ]);

    const client = QredexClient.init({
      baseUrl: "https://api.qredex.test",
      auth: {
        type: "access_token",
        accessToken: "Bearer static-token",
      },
      fetch,
    });

    await client.creators.list();

    expect(calls).toHaveLength(1);
    expect(String(calls[0]!.input)).toBe("https://api.qredex.test/api/v1/integrations/creators");
    expect(getHeader(calls[0]!, "authorization")).toBe("Bearer static-token");
  });

  it("fails fast on invalid SDK request input before making a network call", async () => {
    const { calls, fetch } = createFetchMock([]);

    const client = QredexClient.init({
      baseUrl: "https://api.qredex.test",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.links
      .create({
        store_id: "not-a-uuid",
        creator_id: UUIDS.creator,
        link_name: "demo",
        destination_path: "products/demo",
      })
      .catch((thrown) => thrown);

    expect(error).toBeInstanceOf(QredexValidationError);
    expect(error.errorCode).toBe("sdk_validation_error");
    expect(error.message).toBe("store_id must be a valid UUID.");
    expect(calls).toHaveLength(0);
  });

  it("emits sanitized debug events without leaking authorization data", async () => {
    const events: Array<Record<string, unknown>> = [];
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token-debug",
        token_type: "Bearer",
        expires_in: 3600,
      }),
      jsonResponse(200, {
        items: [],
        page: 0,
        size: 20,
        total_elements: 0,
        total_pages: 0,
      }),
    ]);

    const client = QredexClient.init({
      baseUrl: "https://api.qredex.test",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
      onDebug: (event) => {
        events.push(event as unknown as Record<string, unknown>);
      },
    });

    await client.creators.list();

    expect(events.map((event) => event.type)).toEqual([
      "request",
      "response",
      "auth_token_issued",
      "request",
      "response",
    ]);
    expect(JSON.stringify(events)).not.toContain("secret");
    expect(JSON.stringify(events)).not.toContain("token-debug");
  });
});
