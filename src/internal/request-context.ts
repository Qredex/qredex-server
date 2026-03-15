import type { QredexCallOptions } from "../types";

export interface RequestContext {
  headers: Record<string, string>;
  requestId?: string;
  signal?: AbortSignal;
  timeoutMs: number;
  traceId?: string;
}

export function buildRequestContext(
  defaultTimeoutMs: number,
  callOptions?: QredexCallOptions,
): RequestContext {
  return {
    headers: { ...(callOptions?.headers ?? {}) },
    requestId: callOptions?.requestId,
    signal: callOptions?.signal,
    timeoutMs: callOptions?.timeoutMs ?? defaultTimeoutMs,
    traceId: callOptions?.traceId,
  };
}
