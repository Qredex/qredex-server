import { ValidationError } from "../errors";
import type { QredexCallOptions, QredexLogger, QredexRetryPolicy } from "../types";
import { Transport, type TransportRequest } from "./transport";
import type { TokenProvider } from "./token-provider";
import { clampRetryPolicy, isRetryableStatus, sleep } from "./utils";
import { QredexEventBus } from "./event-bus";

export class HttpClient {
  constructor(
    private readonly eventBus: QredexEventBus,
    private readonly logger: QredexLogger | undefined,
    private readonly readRetry: QredexRetryPolicy | undefined,
    private readonly transport: Transport,
    private readonly tokenProvider: TokenProvider,
  ) {}

  async request<T>(
    request: Omit<TransportRequest, "headers"> & {
      headers?: Record<string, string | undefined>;
      callOptions?: QredexCallOptions;
    },
  ): Promise<T> {
    const retry = this.readRetry
      ? clampRetryPolicy(this.readRetry)
      : { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0 };

    for (let attempt = 1; attempt <= retry.maxAttempts; attempt += 1) {
      const authorization = await this.tokenProvider.getAuthorizationHeader(
        request.callOptions,
      );

      try {
        return await this.transport.request<T>({
          ...request,
          headers: {
            ...request.headers,
            authorization,
          },
        });
      } catch (error) {
        if (!this.shouldRetryRead(request.method, error, attempt, retry.maxAttempts)) {
          throw error;
        }

        const delayMs = Math.min(
          retry.maxDelayMs,
          retry.baseDelayMs * 2 ** Math.max(0, attempt - 1),
        );
        await this.eventBus.emit({
          type: "retry_scheduled",
          attempt,
          delayMs,
          maxAttempts: retry.maxAttempts,
          method: request.method,
          path: request.path,
          reason: error instanceof Error && "status" in error && error.status === 429
            ? "http_429"
            : error instanceof Error && "status" in error
              ? "http_5xx"
              : "network_error",
          source: "read",
        });
        await sleep(delayMs);
      }
    }

    throw new Error("Unreachable read retry state.");
  }

  async reportValidationFailure(
    operation: string,
    error: ValidationError,
  ): Promise<never> {
    this.logger?.warn?.("qredex.validation_failed", {
      errorCode: error.errorCode,
      message: error.message,
      operation,
    });
    await this.eventBus.emit({
      type: "validation_failed",
      errorCode: error.errorCode,
      message: error.message,
      operation,
    });
    throw error;
  }

  private shouldRetryRead(
    method: string,
    error: unknown,
    attempt: number,
    maxAttempts: number,
  ): boolean {
    if (!["GET", "HEAD"].includes(method.toUpperCase())) {
      return false;
    }

    if (attempt >= maxAttempts || maxAttempts <= 1) {
      return false;
    }

    if (error instanceof Error && "status" in error) {
      return isRetryableStatus(error.status as number | undefined);
    }

    return true;
  }
}
