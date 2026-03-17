/**
 *    ▄▄▄▄
 *  ▄█▀▀███▄▄              █▄
 *  ██    ██ ▄             ██
 *  ██    ██ ████▄▄█▀█▄ ▄████ ▄█▀█▄▀██ ██▀
 *  ██  ▄ ██ ██   ██▄█▀ ██ ██ ██▄█▀  ███
 *   ▀█████▄▄█▀  ▄▀█▄▄▄▄█▀███▄▀█▄▄▄▄██ ██▄
 *        ▀█
 *
 *  Copyright (C) 2026 — 2026, Qredex, LTD. All Rights Reserved.
 *
 *  DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 *  Licensed under the Apache License, Version 2.0.0. See LICENSE for the full license text.
 *  You may not use this file except in compliance with that License.
 *  Unless required by applicable law or agreed to in writing, software distributed under the
 *  License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 *  either express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 *
 *  If you need additional information or have any questions, please email: copyright@qredex.com
 */

import { describe, expect, it, vi } from "vitest";

import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ConfigurationError,
  ConflictError,
  NetworkError,
  NotFoundError,
  Qredex,
  QredexError,
  QredexErrorCode,
  QredexHeader,
  QredexScope,
  RateLimitError,
  ValidationError,
  isApiError,
  isAuthenticationError,
  isAuthorizationError,
  isConfigurationError,
  isConflictError,
  isNetworkError,
  isNotFoundError,
  isQredexError,
  isRateLimitError,
  isValidationError,
} from "../src";
import {
  createFetchMock,
  getHeader,
  jsonResponse,
} from "./helpers";

const UUIDS = {
  creator: "11111111-1111-4111-8111-111111111111",
  link: "22222222-2222-4222-8222-222222222222",
  merchant: "33333333-3333-4333-8333-333333333333",
  store: "44444444-4444-4444-8444-444444444444",
};

describe("QredexError hierarchy", () => {
  it("QredexError preserves all metadata", () => {
    const error = new QredexError("test error", {
      status: 500,
      errorCode: "test_error",
      requestId: "req-123",
      traceId: "trace-456",
      responseBody: { error: "test" },
      responseText: "error text",
      cause: new Error("cause"),
    });

    expect(error.name).toBe("QredexError");
    expect(error.message).toBe("test error");
    expect(error.status).toBe(500);
    expect(error.errorCode).toBe("test_error");
    expect(error.requestId).toBe("req-123");
    expect(error.traceId).toBe("trace-456");
    expect(error.responseBody).toEqual({ error: "test" });
    expect(error.responseText).toBe("error text");
    expect(error.cause).toBeInstanceOf(Error);
  });

  it("QredexError works without details", () => {
    const error = new QredexError("simple error");
    expect(error.message).toBe("simple error");
    expect(error.status).toBeUndefined();
    expect(error.errorCode).toBeUndefined();
    expect(error.requestId).toBeUndefined();
    expect(error.traceId).toBeUndefined();
    expect(error.responseBody).toBeUndefined();
    expect(error.responseText).toBeUndefined();
    expect(error.cause).toBeUndefined();
  });

  it("ConfigurationError extends QredexError", () => {
    const error = new ConfigurationError("config failed");
    expect(error).toBeInstanceOf(QredexError);
    expect(error.name).toBe("ConfigurationError");
  });

  it("ApiError extends QredexError", () => {
    const error = new ApiError("api failed");
    expect(error).toBeInstanceOf(QredexError);
    expect(error.name).toBe("ApiError");
  });

  it("AuthenticationError extends ApiError", () => {
    const error = new AuthenticationError("auth failed");
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(QredexError);
    expect(error.name).toBe("AuthenticationError");
  });

  it("AuthorizationError extends ApiError", () => {
    const error = new AuthorizationError("not authorized");
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(QredexError);
    expect(error.name).toBe("AuthorizationError");
  });

  it("ValidationError extends ApiError", () => {
    const error = new ValidationError("invalid input");
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(QredexError);
    expect(error.name).toBe("ValidationError");
  });

  it("NotFoundError extends ApiError", () => {
    const error = new NotFoundError("not found");
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(QredexError);
    expect(error.name).toBe("NotFoundError");
  });

  it("ConflictError extends ApiError", () => {
    const error = new ConflictError("conflict");
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(QredexError);
    expect(error.name).toBe("ConflictError");
  });

  it("RateLimitError extends ApiError with retryAfterSeconds", () => {
    const error = new RateLimitError("rate limited", {
      retryAfterSeconds: 60,
      status: 429,
    });
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toBeInstanceOf(QredexError);
    expect(error.name).toBe("RateLimitError");
    expect(error.retryAfterSeconds).toBe(60);
    expect(error.status).toBe(429);
  });

  it("RateLimitError works without retryAfterSeconds", () => {
    const error = new RateLimitError("rate limited");
    expect(error.retryAfterSeconds).toBeUndefined();
  });

  it("NetworkError extends QredexError", () => {
    const error = new NetworkError("network failed");
    expect(error).toBeInstanceOf(QredexError);
    expect(error.name).toBe("NetworkError");
  });
});

describe("Error type guards", () => {
  it("isQredexError identifies QredexError instances", () => {
    expect(isQredexError(new QredexError("test"))).toBe(true);
    expect(isQredexError(new ConfigurationError("test"))).toBe(true);
    expect(isQredexError(new ApiError("test"))).toBe(true);
    expect(isQredexError(new AuthenticationError("test"))).toBe(true);
    expect(isQredexError(new AuthorizationError("test"))).toBe(true);
    expect(isQredexError(new ValidationError("test"))).toBe(true);
    expect(isQredexError(new NotFoundError("test"))).toBe(true);
    expect(isQredexError(new ConflictError("test"))).toBe(true);
    expect(isQredexError(new RateLimitError("test"))).toBe(true);
    expect(isQredexError(new NetworkError("test"))).toBe(true);
    expect(isQredexError(new Error("plain"))).toBe(false);
    expect(isQredexError("string")).toBe(false);
    expect(isQredexError(null)).toBe(false);
  });

  it("isApiError identifies ApiError instances", () => {
    expect(isApiError(new ApiError("test"))).toBe(true);
    expect(isApiError(new AuthenticationError("test"))).toBe(true);
    expect(isApiError(new AuthorizationError("test"))).toBe(true);
    expect(isApiError(new ValidationError("test"))).toBe(true);
    expect(isApiError(new NotFoundError("test"))).toBe(true);
    expect(isApiError(new ConflictError("test"))).toBe(true);
    expect(isApiError(new RateLimitError("test"))).toBe(true);
    expect(isApiError(new QredexError("test"))).toBe(false);
    expect(isApiError(new NetworkError("test"))).toBe(false);
  });

  it("isAuthenticationError identifies AuthenticationError instances", () => {
    expect(isAuthenticationError(new AuthenticationError("test"))).toBe(true);
    expect(isAuthenticationError(new ApiError("test"))).toBe(false);
  });

  it("isAuthorizationError identifies AuthorizationError instances", () => {
    expect(isAuthorizationError(new AuthorizationError("test"))).toBe(true);
    expect(isAuthorizationError(new ApiError("test"))).toBe(false);
  });

  it("isValidationError identifies ValidationError instances", () => {
    expect(isValidationError(new ValidationError("test"))).toBe(true);
    expect(isValidationError(new ApiError("test"))).toBe(false);
  });

  it("isNotFoundError identifies NotFoundError instances", () => {
    expect(isNotFoundError(new NotFoundError("test"))).toBe(true);
    expect(isNotFoundError(new ApiError("test"))).toBe(false);
  });

  it("isConflictError identifies ConflictError instances", () => {
    expect(isConflictError(new ConflictError("test"))).toBe(true);
    expect(isConflictError(new ApiError("test"))).toBe(false);
  });

  it("isRateLimitError identifies RateLimitError instances", () => {
    expect(isRateLimitError(new RateLimitError("test"))).toBe(true);
    expect(isRateLimitError(new ApiError("test"))).toBe(false);
  });

  it("isNetworkError identifies NetworkError instances", () => {
    expect(isNetworkError(new NetworkError("test"))).toBe(true);
    expect(isNetworkError(new QredexError("test"))).toBe(false);
  });

  it("isConfigurationError identifies ConfigurationError instances", () => {
    expect(isConfigurationError(new ConfigurationError("test"))).toBe(true);
    expect(isConfigurationError(new QredexError("test"))).toBe(false);
  });
});

describe("Qredex client destroy", () => {
  it("destroy() clears event handlers and token cache", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    await client.destroy();
  });

  it("destroy() works with access token auth", async () => {
    const { fetch } = createFetchMock([]);

    const client = Qredex.init({
      auth: {
        type: "access_token",
        accessToken: "static-token",
      },
      fetch,
    });

    await client.destroy();
  });
});

describe("Resource validation failure paths", () => {
  it("creators.create validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.creators.create({ handle: "" }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("handle must be a non-empty string.");
    expect(error.errorCode).toBe("sdk_validation_error");
  });

  it("creators.get validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.creators.get({ creator_id: "" }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("creator_id must be a non-empty string.");
  });

  it("creators.list validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.creators.list({ page: -1 }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("page must be an integer greater than or equal to 0.");
  });

  it("links.create validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.links.create({
      store_id: "",
      creator_id: "",
      link_name: "",
      destination_path: "",
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toContain("store_id must be a non-empty string");
  });

  it("links.get validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.links.get({ link_id: "" }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("link_id must be a non-empty string.");
  });

  it("links.list validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.links.list({ page: -1 }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("page must be an integer greater than or equal to 0.");
  });

  it("intents.issueInfluenceIntentToken validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.intents.issueInfluenceIntentToken({ link_id: "" }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("link_id must be a non-empty string.");
  });

  it("intents.lockPurchaseIntent validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.intents.lockPurchaseIntent({ token: "" }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("token must be a non-empty string.");
  });

  it("orders.list validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.orders.list({ page: -1 }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("page must be an integer greater than or equal to 0.");
  });

  it("orders.getDetails validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.orders.getDetails("").catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("orderAttributionId must be a non-empty string.");
  });

  it("orders.recordPaidOrder validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.orders.recordPaidOrder({
      store_id: "",
      external_order_id: "",
      currency: "",
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toContain("store_id must be a non-empty string");
  });

  it("refunds.recordRefund validation failure throws ValidationError", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.refunds.recordRefund({
      store_id: "",
      external_order_id: "",
      external_refund_id: "",
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toContain("store_id must be a non-empty string");
  });
});

describe("HTTP client edge cases", () => {
  it("handles 429 rate limit with retry-after header", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
      jsonResponse(
        429,
        {
          error_code: "rate_limit_exceeded",
          message: "too many requests",
        },
        {
          "retry-after": "60",
          "x-request-id": "req-429",
        },
      ),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
        retry: {
          maxAttempts: 1,
        },
      },
      fetch,
    });

    const error = await client.creators
      .list()
      .catch((thrown) => thrown);

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfterSeconds).toBe(60);
    expect(error.requestId).toBe("req-429");
  });

  it("handles 403 authorization error", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
      jsonResponse(
        403,
        {
          error_code: "insufficient_scope",
          message: "not authorized",
        },
        {
          "x-request-id": "req-403",
        },
      ),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.creators
      .list()
      .catch((thrown) => thrown);

    expect(error).toBeInstanceOf(AuthorizationError);
    expect(error.errorCode).toBe("insufficient_scope");
    expect(error.requestId).toBe("req-403");
  });

  it("handles non-JSON 429 response", async () => {
    const { fetch, calls } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
      new Response("rate limited", {
        status: 429,
        headers: {
          "retry-after": "30",
          "content-type": "text/plain",
        },
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
        retry: {
          maxAttempts: 1,
        },
      },
      fetch,
    });

    const error = await client.creators
      .list()
      .catch((thrown) => thrown);

    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.retryAfterSeconds).toBe(30);
    expect(error.responseText).toBe("rate limited");
  });

  it("read retry configuration is respected", async () => {
    // Test that readRetry configuration is accepted without error
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
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

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
        readRetry: {
          maxAttempts: 3,
          baseDelayMs: 100,
          maxDelayMs: 1000,
        },
      },
      fetch,
    });

    await client.creators.list();
  });

  it("empty response body returns undefined", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
      new Response(null, {
        status: 204,
        headers: {
          "content-type": "application/json",
        },
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const result = await client.creators.list();
    expect(result).toBeUndefined();
  });
});

describe("Token provider edge cases", () => {
  it("access token auth with lazy resolver", async () => {
    const { calls, fetch } = createFetchMock([
      jsonResponse(200, {
        id: UUIDS.creator,
        handle: "alice",
        status: "ACTIVE",
        created_at: "2026-03-15T10:00:00Z",
        updated_at: "2026-03-15T10:00:00Z",
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        type: "access_token",
        accessToken: async () => "lazy-token",
      },
      fetch,
    });

    await client.creators.list();

    expect(calls).toHaveLength(1);
    expect(getHeader(calls[0]!, "authorization")).toBe("Bearer lazy-token");
  });

  it("clearTokenCache through auth client", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    await client.auth.clearTokenCache();
  });

  it("onTokenIssued callback is called", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "direct:creators:read",
      }),
      jsonResponse(200, {
        items: [],
        page: 0,
        size: 20,
        total_elements: 0,
        total_pages: 0,
      }),
    ]);

    const onTokenIssued = vi.fn();
    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
        onTokenIssued,
      },
      fetch,
    });

    await client.creators.list();

    expect(onTokenIssued).toHaveBeenCalledWith(
      expect.objectContaining({
        token_type: "Bearer",
        expires_in: 3600,
        scope: "direct:creators:read",
      }),
    );
  });

  it("auth retry on network error", async () => {
    const { fetch } = createFetchMock([
      new TypeError("network error"),
      jsonResponse(200, {
        access_token: "token-retry",
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

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
        retry: {
          maxAttempts: 2,
          baseDelayMs: 10,
        },
      },
      fetch,
    });

    await client.creators.list();
  });
});

describe("Event bus edge cases", () => {
  it("subscribe and unsubscribe handlers", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
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
      jsonResponse(200, {
        items: [],
        page: 0,
        size: 20,
        total_elements: 0,
        total_pages: 0,
      }),
    ]);

    const eventHandler = vi.fn();
    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
      onEvent: eventHandler,
    });

    const unsubscribe = client.events.subscribe(eventHandler);
    await client.creators.list();
    unsubscribe();
    await client.creators.list();
  });

  it("on specific event type", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
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

    const responseHandler = vi.fn();
    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const unsubscribe = client.events.on("response", responseHandler);
    await client.creators.list();
    unsubscribe();
  });

  it("event handler error is caught and logged", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
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

    const warnFn = vi.fn();
    const throwingHandler = vi.fn(() => {
      throw new Error("handler error");
    });

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: warnFn,
        error: vi.fn(),
      },
      onEvent: throwingHandler,
    });

    await client.creators.list();

    expect(throwingHandler).toHaveBeenCalled();
    expect(warnFn).toHaveBeenCalledWith(
      "qredex.event_handler_error",
      expect.objectContaining({
        message: "handler error",
      }),
    );
  });

  it("destroy clears all handlers", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const eventHandler = vi.fn();
    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
      onEvent: eventHandler,
    });

    await client.destroy();

    // After destroy, event bus should be cleared
    client.events.emit({ type: "response", durationMs: 10, method: "GET", path: "/test", status: 200 });
    expect(eventHandler).not.toHaveBeenCalled();
  });
});

describe("Validation edge cases", () => {
  it("rejects x-trace-id in defaultHeaders", () => {
    expect(() =>
      Qredex.init({
        auth: {
          type: "access_token",
          accessToken: "token",
        },
        defaultHeaders: {
          "x-trace-id": "test-trace",
        },
      }),
    ).toThrowError(
      "defaultHeaders cannot override 'x-trace-id'. Use traceId instead.",
    );
  });

  it("rejects x-request-id in defaultHeaders", () => {
    expect(() =>
      Qredex.init({
        auth: {
          type: "access_token",
          accessToken: "token",
        },
        defaultHeaders: {
          "x-request-id": "forced-id",
        },
      }),
    ).toThrowError(
      "defaultHeaders cannot override 'x-request-id'. Use requestId instead.",
    );
  });

  it("rejects non-finite timeoutMs", () => {
    expect(() =>
      Qredex.init({
        auth: {
          type: "access_token",
          accessToken: "token",
        },
        timeoutMs: Infinity,
      }),
    ).toThrowError("timeoutMs must be a positive finite number.");
  });

  it("rejects NaN timeoutMs", () => {
    expect(() =>
      Qredex.init({
        auth: {
          type: "access_token",
          accessToken: "token",
        },
        timeoutMs: NaN,
      }),
    ).toThrowError("timeoutMs must be a positive finite number.");
  });

  it("rejects invalid attribution_window_days", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.links.create({
      store_id: UUIDS.store,
      creator_id: UUIDS.creator,
      link_name: "test",
      destination_path: "/test",
      attribution_window_days: 5,
    }).catch((e) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("attribution_window_days must be one of 1, 3, 7, 14, or 30.");
  });

  it("rejects destination_path not starting with /", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.links.create({
      store_id: UUIDS.store,
      creator_id: UUIDS.creator,
      link_name: "test",
      destination_path: "no-slash",
    }).catch((e) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("destination_path must start with '/'.");
  });

  it("rejects invalid currency format", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.orders.recordPaidOrder({
      store_id: UUIDS.store,
      external_order_id: "order-1",
      currency: "usd",
    }).catch((e) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("currency must be a 3-letter uppercase ISO code.");
  });

  it("rejects invalid callOptions timeoutMs", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.creators.list({}, { timeoutMs: -1 }).catch((e) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("timeoutMs must be a positive finite number.");
  });

  it("rejects reserved header in callOptions.headers", async () => {
    const { fetch } = createFetchMock([
      jsonResponse(200, {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    ]);

    const client = Qredex.init({
      environment: "staging",
      auth: {
        clientId: "client",
        clientSecret: "secret",
      },
      fetch,
    });

    const error = await client.creators.list({}, {
      headers: {
        "x-request-id": "forced",
      },
    }).catch((e) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toContain("x-request-id");
  });
});
