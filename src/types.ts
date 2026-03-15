export type MaybePromise<T> = T | Promise<T>;

export type QredexEnvironment = "production" | "staging" | "development";

export interface QredexClock {
  now(): number;
}

export type QredexEvent =
  | {
      type: "request";
      method: string;
      path: string;
      requestId?: string;
      timeoutMs?: number;
      traceId?: string;
    }
  | {
      type: "response";
      durationMs: number;
      method: string;
      path: string;
      requestId?: string;
      status: number;
      traceId?: string;
    }
  | {
      type: "response_error";
      durationMs: number;
      errorCode?: string;
      message?: string;
      method: string;
      path: string;
      requestId?: string;
      retryAfterSeconds?: number;
      status: number;
      traceId?: string;
    }
  | {
      type: "network_error";
      message?: string;
      method: string;
      path: string;
    }
  | {
      type: "auth_token_issued";
      expiresAt: string;
      scope?: string;
      tokenType?: string;
    }
  | {
      type: "auth_cache_hit";
      expiresAt?: string;
      scope?: string;
    }
  | {
      type: "auth_cache_miss";
      scope?: string;
    }
  | {
      type: "retry_scheduled";
      attempt: number;
      delayMs: number;
      maxAttempts: number;
      method?: string;
      path?: string;
      reason: "http_429" | "http_5xx" | "network_error";
      source: "auth" | "read";
    }
  | {
      type: "validation_failed";
      errorCode?: string;
      message: string;
      operation: string;
    };

export type QredexEventType = QredexEvent["type"];
export type QredexDebugEvent = QredexEvent;
export type QredexDebugEventType = QredexEventType;

export type FetchLike = (
  input: Request | URL | string,
  init?: RequestInit,
) => Promise<Response>;

export type DirectScope =
  | "direct:api"
  | "direct:merchant:read"
  | "direct:merchant:write"
  | "direct:links:read"
  | "direct:links:write"
  | "direct:creators:read"
  | "direct:creators:write"
  | "direct:orders:read"
  | "direct:orders:write"
  | "direct:intents:read"
  | "direct:intents:write";

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface IssueTokenRequest {
  scope?: DirectScope[] | string;
}

export interface TokenIssuedEvent {
  token_type: string;
  expires_in: number;
  scope?: string;
  issued_at: string;
  expires_at: string;
}

export interface CachedAccessToken {
  accessToken: string;
  tokenType: string;
  expiresAtMs: number;
  scope?: string;
}

export interface QredexTokenCache {
  get(): MaybePromise<CachedAccessToken | null>;
  set(token: CachedAccessToken): MaybePromise<void>;
  clear(): MaybePromise<void>;
}

export interface QredexLogger {
  debug?(message: string, meta?: Record<string, unknown>): void;
  info?(message: string, meta?: Record<string, unknown>): void;
  warn?(message: string, meta?: Record<string, unknown>): void;
  error?(message: string, meta?: Record<string, unknown>): void;
}

export type QredexEventHook = (
  event: QredexEvent,
) => MaybePromise<void>;
export type QredexDebugHook = QredexEventHook;

export interface QredexRetryPolicy {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

export interface ClientCredentialsAuthOptions {
  type?: "client_credentials";
  clientId: string;
  clientSecret: string;
  scope?: DirectScope[] | string;
  tokenCache?: QredexTokenCache;
  refreshWindowMs?: number;
  retry?: QredexRetryPolicy;
  onTokenIssued?: (event: TokenIssuedEvent) => MaybePromise<void>;
}

export interface AccessTokenAuthOptions {
  type: "access_token";
  accessToken: string | (() => MaybePromise<string>);
}

export type QredexAuthOptions =
  | ClientCredentialsAuthOptions
  | AccessTokenAuthOptions;

export interface QredexCallOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  requestId?: string;
  traceId?: string;
  headers?: Record<string, string>;
}

export interface QredexClientOptions {
  baseUrl?: string;
  environment?: QredexEnvironment;
  auth: QredexAuthOptions;
  timeoutMs?: number;
  fetch?: FetchLike;
  logger?: QredexLogger;
  onEvent?: QredexEventHook;
  onDebug?: QredexDebugHook;
  readRetry?: QredexRetryPolicy;
  clock?: QredexClock;
  defaultHeaders?: Record<string, string>;
  userAgentSuffix?: string;
}
