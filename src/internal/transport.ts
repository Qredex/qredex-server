import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NetworkError,
  RateLimitError,
  ValidationError,
} from "../errors";
import type { FetchLike, QredexCallOptions, QredexLogger } from "../types";
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
  fetch: FetchLike;
  timeoutMs: number;
  logger?: QredexLogger;
  defaultHeaders?: Record<string, string>;
  userAgentSuffix?: string;
}

export class Transport {
  private readonly baseUrl: string;
  private readonly fetchImplementation: FetchLike;
  private readonly timeoutMs: number;
  private readonly logger?: QredexLogger;
  private readonly defaultHeaders: Record<string, string>;
  private readonly userAgent: string;

  constructor(options: TransportOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetchImplementation = options.fetch;
    this.timeoutMs = options.timeoutMs;
    this.logger = options.logger;
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.userAgent = options.userAgentSuffix
      ? `@qredex/sdk ${options.userAgentSuffix}`.trim()
      : "@qredex/sdk";
  }

  async request<T>(request: TransportRequest): Promise<T> {
    const url = new URL(`${this.baseUrl}${request.path}`);
    appendQuery(url, request.query);

    const headers = new Headers(this.defaultHeaders);
    headers.set("accept", "application/json");
    headers.set("x-qredex-sdk", "@qredex/sdk");

    if (!headers.has("user-agent")) {
      headers.set("user-agent", this.userAgent);
    }

    if (request.callOptions?.requestId) {
      headers.set("x-request-id", request.callOptions.requestId);
    }

    if (request.callOptions?.traceId) {
      headers.set("x-trace-id", request.callOptions.traceId);
    }

    if (request.callOptions?.headers) {
      for (const [key, value] of Object.entries(request.callOptions.headers)) {
        headers.set(key, value);
      }
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

    const timeoutMs = request.callOptions?.timeoutMs ?? this.timeoutMs;
    const controller = new AbortController();
    const cleanupSignal = this.forwardAbort(request.callOptions?.signal, controller);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await this.fetchImplementation(url, {
        method: request.method,
        headers,
        body: body ?? null,
        signal: controller.signal,
      });

      const durationMs = Date.now() - startedAt;
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
        const message =
          this.extractMessage(responseBody) ??
          (response.statusText ||
            DEFAULT_STATUS_MESSAGES[response.status] ||
            `Qredex API request failed with status ${response.status}`);
        const errorCode = this.extractErrorCode(responseBody);
        const details = {
          status: response.status,
          errorCode,
          requestId,
          traceId,
          responseBody,
          responseText: responseText || undefined,
        };

        this.logger?.warn?.("qredex.response.error", {
          durationMs,
          method: request.method,
          path: request.path,
          requestId,
          status: response.status,
          traceId,
        });

        if (response.status === 400) {
          throw new ValidationError(message, details);
        }

        if (response.status === 401) {
          throw new AuthenticationError(message, details);
        }

        if (response.status === 403) {
          throw new AuthorizationError(message, details);
        }

        if (response.status === 409) {
          throw new ConflictError(message, details);
        }

        if (response.status === 429) {
          const retryAfterHeader = response.headers.get("retry-after");
          const retryAfterSeconds = retryAfterHeader
            ? Number.parseInt(retryAfterHeader, 10)
            : undefined;

          throw new RateLimitError(message, {
            ...details,
            retryAfterSeconds: Number.isFinite(retryAfterSeconds)
              ? retryAfterSeconds
              : undefined,
          });
        }

        throw new ApiError(message, details);
      }

      this.logger?.info?.("qredex.response", {
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
      if (
        error instanceof ApiError ||
        error instanceof ValidationError ||
        error instanceof AuthenticationError ||
        error instanceof AuthorizationError ||
        error instanceof ConflictError ||
        error instanceof RateLimitError
      ) {
        throw error;
      }

      const message =
        controller.signal.aborted && !request.callOptions?.signal?.aborted
          ? `Request timed out after ${timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : "Network request failed";

      this.logger?.error?.("qredex.network_error", {
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
