import { afterEach, describe, expect, it } from "vitest";

import { AuthenticationError, ConflictError, Qredex, RateLimitError } from "../src";
import { createDevelopmentProxyFetch, startMockQredexServer } from "./mock-server";

const UUIDS = {
  creator: "11111111-1111-4111-8111-111111111111",
  link: "22222222-2222-4222-8222-222222222222",
  merchant: "33333333-3333-4333-8333-333333333333",
  store: "44444444-4444-4444-8444-444444444444",
};

const TIMESTAMPS = {
  creator: "2026-03-15T10:00:00Z",
  link: "2026-03-15T10:01:00Z",
  intent: "2026-03-15T10:02:00Z",
  pit: "2026-03-15T10:03:00Z",
  order: "2026-03-15T10:04:00Z",
  refund: "2026-03-15T10:05:00Z",
};

const closers: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (closers.length > 0) {
    const close = closers.pop();
    if (close) {
      await close();
    }
  }
});

describe("Qredex mock server integration", () => {
  it("exercises the canonical machine flow over a real local HTTP server", async () => {
    const server = await startMockQredexServer([
      {
        method: "POST",
        path: "/api/v1/auth/token",
        handler: ({ bodyText, headers }) => {
          expect(headers.authorization).toBe("Basic Y2xpZW50OnNlY3JldA==");
          expect(bodyText).toContain("grant_type=client_credentials");
          return {
            status: 200,
            body: {
              access_token: "mock-token",
              token_type: "Bearer",
              expires_in: 3600,
            },
          };
        },
      },
      {
        method: "POST",
        path: "/api/v1/integrations/creators",
        handler: ({ bodyText, headers }) => {
          expect(headers.authorization).toBe("Bearer mock-token");
          const body = JSON.parse(bodyText) as { handle: string; display_name?: string };
          expect(body.handle).toBe("alice");
          return {
            status: 201,
            body: {
              id: UUIDS.creator,
              handle: body.handle,
              display_name: body.display_name ?? null,
              status: "ACTIVE",
              created_at: TIMESTAMPS.creator,
              updated_at: TIMESTAMPS.creator,
            },
          };
        },
      },
      {
        method: "GET",
        path: `/api/v1/integrations/creators/${UUIDS.creator}`,
        handler: ({ headers }) => {
          expect(headers.authorization).toBe("Bearer mock-token");
          return {
            status: 200,
            body: {
              id: UUIDS.creator,
              handle: "alice",
              display_name: "Alice",
              status: "ACTIVE",
              created_at: TIMESTAMPS.creator,
              updated_at: TIMESTAMPS.creator,
            },
          };
        },
      },
      {
        method: "GET",
        path: "/api/v1/integrations/creators",
        handler: ({ headers, query }) => {
          expect(headers.authorization).toBe("Bearer mock-token");
          expect(query.get("status")).toBe("ACTIVE");
          return {
            status: 200,
            body: {
              items: [
                {
                  id: UUIDS.creator,
                  handle: "alice",
                  status: "ACTIVE",
                  created_at: TIMESTAMPS.creator,
                  updated_at: TIMESTAMPS.creator,
                },
              ],
              page: 0,
              size: 20,
              total_elements: 1,
              total_pages: 1,
            },
          };
        },
      },
      {
        method: "POST",
        path: "/api/v1/integrations/links",
        handler: ({ bodyText, headers }) => {
          expect(headers.authorization).toBe("Bearer mock-token");
          const body = JSON.parse(bodyText) as {
            store_id: string;
            creator_id: string;
            link_name: string;
            destination_path: string;
          };
          expect(body.store_id).toBe(UUIDS.store);
          return {
            status: 201,
            body: {
              id: UUIDS.link,
              merchant_id: UUIDS.merchant,
              store_id: body.store_id,
              creator_id: body.creator_id,
              link_name: body.link_name,
              link_code: "ABCDE",
              public_link_url: "https://staging.qredex.test/alice/ABCDE",
              destination_path: body.destination_path,
              status: "ACTIVE",
              attribution_window_days: 30,
              created_at: TIMESTAMPS.link,
              updated_at: TIMESTAMPS.link,
            },
          };
        },
      },
      {
        method: "GET",
        path: `/api/v1/integrations/links/${UUIDS.link}`,
        handler: ({ headers }) => {
          expect(headers.authorization).toBe("Bearer mock-token");
          return {
            status: 200,
            body: {
              id: UUIDS.link,
              merchant_id: UUIDS.merchant,
              store_id: UUIDS.store,
              creator_id: UUIDS.creator,
              link_name: "spring-launch",
              link_code: "ABCDE",
              public_link_url: "https://staging.qredex.test/alice/ABCDE",
              destination_path: "/products/spring-launch",
              status: "ACTIVE",
              attribution_window_days: 30,
              created_at: TIMESTAMPS.link,
              updated_at: TIMESTAMPS.link,
            },
          };
        },
      },
      {
        method: "GET",
        path: "/api/v1/integrations/links",
        handler: ({ headers, query }) => {
          expect(headers.authorization).toBe("Bearer mock-token");
          expect(query.get("status")).toBe("ACTIVE");
          return {
            status: 200,
            body: {
              items: [
                {
                  id: UUIDS.link,
                  store_id: UUIDS.store,
                  link_name: "spring-launch",
                  link_code: "ABCDE",
                  destination_path: "/products/spring-launch",
                  status: "ACTIVE",
                  attribution_window_days: 30,
                  created_at: TIMESTAMPS.link,
                  updated_at: TIMESTAMPS.link,
                  creator_id: UUIDS.creator,
                  creator_handle: "alice",
                },
              ],
              page: 0,
              size: 20,
              total_elements: 1,
              total_pages: 1,
            },
          };
        },
      },
      {
        method: "POST",
        path: "/api/v1/integrations/intents/token",
        handler: ({ bodyText, headers }) => {
          expect(headers.authorization).toBe("Bearer mock-token");
          const body = JSON.parse(bodyText) as { link_id: string };
          expect(body.link_id).toBe(UUIDS.link);
          return {
            status: 201,
            body: {
              id: "iit-1",
              merchant_id: UUIDS.merchant,
              link_id: body.link_id,
              token: "iit-token",
              token_id: "iit-token-id",
              issued_at: TIMESTAMPS.intent,
              expires_at: "2026-03-16T10:02:00Z",
              status: "ACTIVE",
              integrity_version: 2,
            },
          };
        },
      },
      {
        method: "POST",
        path: "/api/v1/integrations/intents/lock",
        handler: ({ bodyText, headers }) => {
          expect(headers.authorization).toBe("Bearer mock-token");
          const body = JSON.parse(bodyText) as { token: string; source: string };
          expect(body.token).toBe("iit-token");
          return {
            status: 201,
            body: {
              id: "pit-1",
              merchant_id: UUIDS.merchant,
              store_id: UUIDS.store,
              link_id: UUIDS.link,
              token: "pit-token",
              token_id: "pit-token-id",
              source: body.source,
              origin_match_status: "MATCH",
              window_status: "WITHIN",
              attribution_window_days_snapshot: 30,
              store_domain_snapshot: "demo-store.example",
              issued_at: TIMESTAMPS.intent,
              expires_at: "2026-03-16T10:03:00Z",
              locked_at: TIMESTAMPS.pit,
              integrity_version: 2,
              eligible: true,
            },
          };
        },
      },
      {
        method: "POST",
        path: "/api/v1/integrations/orders/paid",
        handler: ({ bodyText, headers }) => {
          expect(headers.authorization).toBe("Bearer mock-token");
          const body = JSON.parse(bodyText) as { external_order_id: string; purchase_intent_token: string };
          expect(body.purchase_intent_token).toBe("pit-token");
          return {
            status: 201,
            body: {
              id: "order-attr-1",
              merchant_id: UUIDS.merchant,
              order_source: "DIRECT_API",
              external_order_id: body.external_order_id,
              currency: "USD",
              duplicate_suspect: false,
              integrity_score: 95,
              integrity_band: "HIGH",
              review_required: false,
              resolution_status: "ATTRIBUTED",
              token_integrity: "VALID",
              created_at: TIMESTAMPS.order,
              updated_at: TIMESTAMPS.order,
            },
          };
        },
      },
      {
        method: "POST",
        path: "/api/v1/integrations/orders/refund",
        handler: ({ bodyText, headers }) => {
          expect(headers.authorization).toBe("Bearer mock-token");
          const body = JSON.parse(bodyText) as { external_order_id: string; external_refund_id: string };
          return {
            status: 201,
            body: {
              id: "order-attr-1",
              merchant_id: UUIDS.merchant,
              order_source: "DIRECT_API",
              external_order_id: body.external_order_id,
              currency: "USD",
              duplicate_suspect: false,
              integrity_score: 95,
              integrity_band: "HIGH",
              review_required: false,
              resolution_status: "ATTRIBUTED",
              token_integrity: "VALID",
              integrity_reason: null,
              refund_reference: body.external_refund_id,
              created_at: TIMESTAMPS.refund,
              updated_at: TIMESTAMPS.refund,
            },
          };
        },
      },
    ]);
    closers.push(server.close);

    const qredex = Qredex.init({
      environment: "development",
      fetch: createDevelopmentProxyFetch(server.baseUrl),
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
    });

    const creator = await qredex.creators.create({
      handle: "alice",
      display_name: "Alice",
    });
    const fetchedCreator = await qredex.creators.get({ creator_id: UUIDS.creator });
    const listedCreators = await qredex.creators.list({ status: "ACTIVE" });
    const link = await qredex.links.create({
      store_id: UUIDS.store,
      creator_id: UUIDS.creator,
      link_name: "spring-launch",
      destination_path: "/products/spring-launch",
    });
    const fetchedLink = await qredex.links.get({ link_id: UUIDS.link });
    const listedLinks = await qredex.links.list({ status: "ACTIVE" });
    const iit = await qredex.intents.issueInfluenceIntentToken({ link_id: UUIDS.link });
    const pit = await qredex.intents.lockPurchaseIntent({
      token: iit.token,
      source: "backend-cart-lock",
      integrity_version: 2,
    });
    const order = await qredex.orders.recordPaidOrder({
      store_id: UUIDS.store,
      external_order_id: "order-1001",
      currency: "USD",
      purchase_intent_token: pit.token,
    });
    const refund = await qredex.refunds.recordRefund({
      store_id: UUIDS.store,
      external_order_id: "order-1001",
      external_refund_id: "refund-1001-1",
      refund_total: 25,
    });

    expect(creator.id).toBe(UUIDS.creator);
    expect(fetchedCreator.handle).toBe("alice");
    expect(listedCreators.items).toHaveLength(1);
    expect(link.id).toBe(UUIDS.link);
    expect(fetchedLink.link_code).toBe("ABCDE");
    expect(listedLinks.items).toHaveLength(1);
    expect(iit.token).toBe("iit-token");
    expect(pit.token).toBe("pit-token");
    expect(order.resolution_status).toBe("ATTRIBUTED");
    expect(refund.external_order_id).toBe("order-1001");
  });

  it("parses auth, retry, and conflict failures over a real local HTTP server", async () => {
    const server = await startMockQredexServer([
      {
        method: "POST",
        path: "/api/v1/auth/token",
        handler: ({ headers }) => {
          if (headers.authorization === "Basic YmFkOmNyZWRz") {
            return {
              status: 401,
              body: {
                error_code: "invalid_client",
                message: "client credentials rejected",
              },
            };
          }

          return {
            status: 200,
            body: {
              access_token: "retry-token",
              token_type: "Bearer",
              expires_in: 3600,
            },
          };
        },
      },
      {
        method: "GET",
        path: "/api/v1/integrations/creators",
        handler: (_request, attempt) => {
          if (attempt === 1) {
            return {
              status: 429,
              body: {
                error_code: "rate_limited",
                message: "try again shortly",
              },
              headers: {
                "retry-after": "0",
              },
            };
          }

          return {
            status: 200,
            body: {
              items: [],
              page: 0,
              size: 20,
              total_elements: 0,
              total_pages: 0,
            },
          };
        },
      },
      {
        method: "POST",
        path: "/api/v1/integrations/orders/refund",
        handler: () => ({
          status: 409,
          body: {
            error_code: "REJECTED_CROSS_SOURCE_DUPLICATE",
            message: "refund rejected by duplicate policy",
          },
        }),
      },
    ]);
    closers.push(server.close);

    const badQredex = Qredex.init({
      environment: "development",
      fetch: createDevelopmentProxyFetch(server.baseUrl),
      auth: {
        clientId: "bad",
        clientSecret: "creds",
      },
    });

    const authError = await badQredex.auth.issueToken().catch((error) => error);
    expect(authError).toBeInstanceOf(AuthenticationError);
    expect(authError.errorCode).toBe("invalid_client");

    const events: string[] = [];
    const qredex = Qredex.init({
      environment: "development",
      fetch: createDevelopmentProxyFetch(server.baseUrl),
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      readRetry: {
        maxAttempts: 2,
        baseDelayMs: 0,
        maxDelayMs: 0,
      },
      onEvent: (event) => {
        if (event.type === "retry_scheduled") {
          events.push(`${event.source}:${event.reason}:${event.attempt}`);
        }
      },
    });

    const creators = await qredex.creators.list();
    expect(creators.items).toEqual([]);
    expect(events).toEqual(["read:http_429:1"]);

    const conflictError = await qredex.refunds.recordRefund({
      store_id: UUIDS.store,
      external_order_id: "order-1001",
      external_refund_id: "refund-1001-1",
    }).catch((error) => error);

    expect(conflictError).toBeInstanceOf(ConflictError);
    expect(conflictError.errorCode).toBe("REJECTED_CROSS_SOURCE_DUPLICATE");
  });

  it("preserves 429 metadata when read retries are disabled", async () => {
    const server = await startMockQredexServer([
      {
        method: "GET",
        path: "/api/v1/integrations/creators",
        handler: () => ({
          status: 429,
          body: {
            error_code: "rate_limited",
            message: "slow down",
          },
          headers: {
            "retry-after": "12",
          },
        }),
      },
    ]);
    closers.push(server.close);

    const qredex = Qredex.init({
      environment: "development",
      fetch: createDevelopmentProxyFetch(server.baseUrl),
      auth: {
        type: "access_token",
        accessToken: "static-token",
      },
    });

    const error = await qredex.creators.list().catch((thrown) => thrown);

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfterSeconds).toBe(12);
    expect(error.errorCode).toBe("rate_limited");
  });
});
