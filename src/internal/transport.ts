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
 *  Licensed under the Apache License, Version 2.0. See LICENSE for the full license text.
 *  You may not use this file except in compliance with that License.
 *  Unless required by applicable law or agreed to in writing, software distributed under the
 *  License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 *  either express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 *
 *  If you need additional information or have any questions, please email: copyright@qredex.com
 */

import { NetworkError, isQredexError } from "../errors";
import type {
  FetchLike,
  QredexClock,
  QredexCallOptions,
  QredexLogger,
} from "../types";
import { createApiError } from "./api-error-factory";
import { QredexEventBus } from "./event-bus";
import { buildRequestContext } from "./request-context";
import {
  appendQuery,
  maybeParseJson,
  normalizeBaseUrl,
  pickFirstHeader,
} from "./utils";

const DEFAULT_STATUS_MESSAGES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

export interface TransportRequest {
  method: string;
  path: string;
  query?: object;
  body?: unknown;
  bodyType?: "form" | "json" | "text";
  headers?: Record<string, string | undefined>;
  callOptions?: QredexCallOptions;
}

interface TransportOptions {
  baseUrl: string;
  clock: QredexClock;
  eventBus: QredexEventBus;
  fetch: FetchLike;
  timeoutMs: number;
  logger?: QredexLogger;
  defaultHeaders?: Record<string, string>;
  userAgentSuffix?: string;
}

export class Transport {
  private readonly baseUrl: string;
  private readonly clock: QredexClock;
  private readonly eventBus: QredexEventBus;
  private readonly fetchImplementation: FetchLike;
  private readonly timeoutMs: number;
  private readonly logger?: QredexLogger;
  private readonly defaultHeaders: Record<string, string>;
  private readonly userAgent: string;

  constructor(options: TransportOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.clock = options.clock;
    this.eventBus = options.eventBus;
    this.fetchImplementation = options.fetch;
    this.timeoutMs = options.timeoutMs;
    this.logger = options.logger;
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.userAgent = options.userAgentSuffix
      ? `@qredex/server ${options.userAgentSuffix}`.trim()
      : "@qredex/server";
  }

  async request<T>(request: TransportRequest): Promise<T> {
    const url = new URL(`${this.baseUrl}${request.path}`);
    appendQuery(url, request.query);
    const context = buildRequestContext(this.timeoutMs, this.clock, request.callOptions);

    const headers = new Headers(this.defaultHeaders);
    headers.set("accept", "application/json");
    headers.set("x-qredex-sdk", "@qredex/server");

    if (!headers.has("user-agent")) {
      headers.set("user-agent", this.userAgent);
    }

    if (context.requestId) {
      headers.set("x-request-id", context.requestId);
    }

    if (context.traceId) {
      headers.set("x-trace-id", context.traceId);
    }

    for (const [key, value] of Object.entries(context.headers)) {
      headers.set(key, value);
    }

    if (request.headers) {
      for (const [key, value] of Object.entries(request.headers)) {
        if (value !== undefined) {
          headers.set(key, value);
        }
      }
    }

    let body: BodyInit | undefined;

    if (request.body !== undefined) {
      if (request.bodyType === "form") {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(
          request.body as Record<string, unknown>,
        )) {
          if (value === undefined || value === null) {
            continue;
          }

          params.set(key, String(value));
        }
        headers.set("content-type", "application/x-www-form-urlencoded");
        body = params.toString();
      } else if (request.bodyType === "text") {
        body = String(request.body);
      } else {
        headers.set("content-type", "application/json");
        body = JSON.stringify(request.body);
      }
    }

    await this.eventBus.emit({
      type: "request",
      method: request.method,
      path: request.path,
      requestId: context.requestId,
      timeoutMs: context.timeoutMs,
      traceId: context.traceId,
    });

    const controller = new AbortController();
    const cleanupSignal = this.forwardAbort(context.signal, controller);
    const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
    try {
      const response = await this.fetchImplementation(url, {
        method: request.method,
        headers,
        body: body ?? null,
        signal: controller.signal,
      });

      const durationMs = this.clock.now() - context.startedAtMs;
      const responseText = await response.text();
      const responseBody = maybeParseJson(responseText);
      const requestId = pickFirstHeader(response.headers, [
        "x-request-id",
        "request-id",
        "x-correlation-id",
      ]);
      const traceId = pickFirstHeader(response.headers, [
        "x-trace-id",
        "trace-id",
        "traceparent",
      ]);

      if (!response.ok) {
        const retryAfterHeader = response.headers.get("retry-after");
        const retryAfterSeconds = retryAfterHeader
          ? Number.parseInt(retryAfterHeader, 10)
          : undefined;
        const errorCode = this.extractErrorCode(responseBody);
        const message =
          this.extractMessage(responseBody) ??
          (response.statusText ||
            DEFAULT_STATUS_MESSAGES[response.status] ||
            `Qredex API request failed with status ${response.status}`);

        this.logger?.warn?.("qredex.response.error", {
          durationMs,
          method: request.method,
          path: request.path,
          requestId,
          status: response.status,
          traceId,
        });
        await this.eventBus.emit({
          type: "response_error",
          durationMs,
          errorCode,
          message,
          method: request.method,
          path: request.path,
          requestId,
          retryAfterSeconds: Number.isFinite(retryAfterSeconds)
            ? retryAfterSeconds
            : undefined,
          status: response.status,
          traceId,
        });

        throw createApiError({
          status: response.status,
          errorCode,
          message,
          requestId,
          traceId,
          responseBody,
          responseText: responseText || undefined,
          retryAfterSeconds: Number.isFinite(retryAfterSeconds)
            ? retryAfterSeconds
            : undefined,
        });
      }

      this.logger?.info?.("qredex.response", {
        durationMs,
        method: request.method,
        path: request.path,
        requestId,
        status: response.status,
        traceId,
      });
      await this.eventBus.emit({
        type: "response",
        durationMs,
        method: request.method,
        path: request.path,
        requestId,
        status: response.status,
        traceId,
      });

      if (!responseText) {
        return undefined as T;
      }

      return (responseBody ?? responseText) as T;
    } catch (error) {
      if (isQredexError(error)) {
        throw error;
      }

      const message =
        controller.signal.aborted && !context.signal?.aborted
          ? `Request timed out after ${context.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : "Network request failed";

      this.logger?.error?.("qredex.network_error", {
        method: request.method,
        path: request.path,
      });
      await this.eventBus.emit({
        type: "network_error",
        message,
        method: request.method,
        path: request.path,
      });

      throw new NetworkError(message, { cause: error });
    } finally {
      clearTimeout(timeout);
      cleanupSignal();
    }
  }

  private forwardAbort(
    source: AbortSignal | undefined,
    target: AbortController,
  ): () => void {
    if (!source) {
      return () => undefined;
    }

    if (source.aborted) {
      target.abort();
      return () => undefined;
    }

    const listener = () => {
      target.abort();
    };

    source.addEventListener("abort", listener, { once: true });

    return () => {
      source.removeEventListener("abort", listener);
    };
  }

  private extractMessage(responseBody: unknown): string | undefined {
    if (
      typeof responseBody === "object" &&
      responseBody !== null &&
      "message" in responseBody &&
      typeof responseBody.message === "string"
    ) {
      return responseBody.message;
    }

    return undefined;
  }

  private extractErrorCode(responseBody: unknown): string | undefined {
    if (
      typeof responseBody === "object" &&
      responseBody !== null &&
      "error_code" in responseBody &&
      typeof responseBody.error_code === "string"
    ) {
      return responseBody.error_code;
    }

    return undefined;
  }
}
