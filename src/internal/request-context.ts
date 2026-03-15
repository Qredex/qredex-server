import type { QredexCallOptions, QredexClock } from "../types";

export interface RequestContext {
  headers: Record<string, string>;
  requestId?: string;
  signal?: AbortSignal;
  startedAtMs: number;
  timeoutMs: number;
  traceId?: string;
}

export function buildRequestContext(
  defaultTimeoutMs: number,
  clock: QredexClock,
  callOptions?: QredexCallOptions,
): RequestContext {
  return {
    headers: { ...(callOptions?.headers ?? {}) },
    requestId: callOptions?.requestId,
    signal: callOptions?.signal,
    startedAtMs: clock.now(),
    timeoutMs: callOptions?.timeoutMs ?? defaultTimeoutMs,
    traceId: callOptions?.traceId,
  };
}
