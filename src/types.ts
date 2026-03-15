export type MaybePromise<T> = T | Promise<T>;

export type QredexDebugEventType =
  | "request"
  | "response"
  | "response_error"
  | "network_error"
  | "auth_token_issued";

export interface QredexDebugEvent {
  type: QredexDebugEventType;
  method?: string;
  path?: string;
  status?: number;
  durationMs?: number;
  timeoutMs?: number;
  requestId?: string;
  traceId?: string;
  errorCode?: string;
  message?: string;
  retryAfterSeconds?: number;
  scope?: string;
  tokenType?: string;
  expiresAt?: string;
}

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

export type QredexDebugHook = (
  event: QredexDebugEvent,
) => MaybePromise<void>;

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
  baseUrl: string;
  auth: QredexAuthOptions;
  timeoutMs?: number;
  fetch?: FetchLike;
  logger?: QredexLogger;
  onDebug?: QredexDebugHook;
  defaultHeaders?: Record<string, string>;
  userAgentSuffix?: string;
}
