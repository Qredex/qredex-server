import { ConfigurationError, NetworkError, QredexError } from "../errors";
import { MemoryTokenCache } from "../token-cache";
import type {
  CachedAccessToken,
  ClientCredentialsAuthOptions,
  IssueTokenRequest,
  OAuthTokenResponse,
  QredexAuthOptions,
  QredexCallOptions,
  QredexDebugHook,
  QredexLogger,
  QredexTokenCache,
} from "../types";
import { emitDebugEvent } from "./debug";
import { Transport } from "./transport";
import {
  clampRetryPolicy,
  computeRetryDelayMs,
  isAccessTokenAuth,
  isClientCredentialsAuth,
  isRetryableStatus,
  normalizeScope,
  resolveAccessToken,
  scopesEqual,
  sleep,
  toBasicAuthHeader,
  toIsoDate,
} from "./utils";

export interface TokenProvider {
  clearTokenCache(): Promise<void>;
  getAuthorizationHeader(callOptions?: QredexCallOptions): Promise<string>;
  issueToken(
    request?: IssueTokenRequest,
    callOptions?: QredexCallOptions,
  ): Promise<OAuthTokenResponse>;
}

export interface TokenProviderOptions {
  auth: QredexAuthOptions;
  logger?: QredexLogger;
  onDebug?: QredexDebugHook;
  transport: Transport;
}

export function createTokenProvider(options: TokenProviderOptions): TokenProvider {
  if (isAccessTokenAuth(options.auth)) {
    return new StaticAccessTokenProvider(options.auth);
  }

  if (isClientCredentialsAuth(options.auth)) {
    return new ClientCredentialsTokenProvider({
      ...options,
      auth: options.auth,
    });
  }

  throw new ConfigurationError("Unsupported Qredex auth configuration.");
}

class StaticAccessTokenProvider implements TokenProvider {
  constructor(private readonly auth: Extract<QredexAuthOptions, { type: "access_token" }>) {}

  async clearTokenCache(): Promise<void> {}

  async getAuthorizationHeader(): Promise<string> {
    const token = await resolveAccessToken(this.auth.accessToken);
    if (!token) {
      throw new ConfigurationError("Qredex accessToken resolved to an empty value.");
    }

    return `Bearer ${token}`;
  }

  async issueToken(): Promise<OAuthTokenResponse> {
    throw new ConfigurationError(
      "Token issuance requires client credentials auth configuration.",
    );
  }
}

class ClientCredentialsTokenProvider implements TokenProvider {
  private readonly auth: ClientCredentialsAuthOptions;
  private readonly logger?: QredexLogger;
  private readonly onDebug?: QredexDebugHook;
  private readonly refreshWindowMs: number;
  private readonly tokenCache: QredexTokenCache;
  private inFlightToken?: Promise<CachedAccessToken>;

  constructor(options: TokenProviderOptions & { auth: ClientCredentialsAuthOptions }) {
    this.auth = options.auth;
    this.logger = options.logger;
    this.onDebug = options.onDebug;
    this.transport = options.transport;
    this.refreshWindowMs = Math.max(0, this.auth.refreshWindowMs ?? 30_000);
    this.tokenCache = this.auth.tokenCache ?? new MemoryTokenCache();
  }

  private readonly transport: Transport;

  async clearTokenCache(): Promise<void> {
    this.inFlightToken = undefined;
    await this.tokenCache.clear();
  }

  async getAuthorizationHeader(
    callOptions?: QredexCallOptions,
  ): Promise<string> {
    const cachedToken = await this.tokenCache.get();
    if (cachedToken && cachedToken.expiresAtMs - this.refreshWindowMs > Date.now()) {
      return `${cachedToken.tokenType} ${cachedToken.accessToken}`;
    }

    if (!this.inFlightToken) {
      const pending = this.fetchToken(
        normalizeScope(this.auth.scope),
        callOptions,
        true,
      ).then(({ cachedToken: token }) => token);

      this.inFlightToken = pending;
      void pending
        .finally(() => {
          if (this.inFlightToken === pending) {
            this.inFlightToken = undefined;
          }
        })
        .catch(() => undefined);
    }

    const token = await this.inFlightToken;
    return `${token.tokenType} ${token.accessToken}`;
  }

  async issueToken(
    request: IssueTokenRequest = {},
    callOptions?: QredexCallOptions,
  ): Promise<OAuthTokenResponse> {
    const scope = normalizeScope(request.scope) ?? normalizeScope(this.auth.scope);
    const cacheResult = scopesEqual(scope, this.auth.scope);
    const { response } = await this.fetchToken(scope, callOptions, cacheResult);
    return response;
  }

  private async fetchToken(
    requestedScope: string | undefined,
    callOptions: QredexCallOptions | undefined,
    cacheResult: boolean,
  ): Promise<{ response: OAuthTokenResponse; cachedToken: CachedAccessToken }> {
    const retry = clampRetryPolicy(this.auth.retry);

    for (let attempt = 1; attempt <= retry.maxAttempts; attempt += 1) {
      try {
        const response = await this.transport.request<OAuthTokenResponse>({
          method: "POST",
          path: "/api/v1/auth/token",
          bodyType: "form",
          body: {
            grant_type: "client_credentials",
            scope: requestedScope,
          },
          headers: {
            authorization: toBasicAuthHeader(
              this.auth.clientId,
              this.auth.clientSecret,
            ),
          },
          callOptions,
        });

        const issuedAtMs = Date.now();
        const cachedToken: CachedAccessToken = {
          accessToken: response.access_token,
          tokenType: response.token_type || "Bearer",
          expiresAtMs: issuedAtMs + response.expires_in * 1_000,
          scope: response.scope,
        };

        if (cacheResult) {
          await this.tokenCache.set(cachedToken);
        }

        const event = {
          type: "auth_token_issued" as const,
          expiresAt: toIsoDate(cachedToken.expiresAtMs),
          scope: response.scope,
          tokenType: cachedToken.tokenType,
        };

        this.logger?.info?.("qredex.auth.token_issued", {
          expiresAt: event.expiresAt,
          scope: event.scope,
          tokenType: event.tokenType,
        });
        await emitDebugEvent(this.onDebug, this.logger, event);
        await this.auth.onTokenIssued?.({
          token_type: cachedToken.tokenType,
          expires_in: response.expires_in,
          scope: response.scope,
          issued_at: toIsoDate(issuedAtMs),
          expires_at: toIsoDate(cachedToken.expiresAtMs),
        });

        return { response, cachedToken };
      } catch (error) {
        if (!this.shouldRetry(error, attempt, retry.maxAttempts)) {
          throw error;
        }

        await sleep(computeRetryDelayMs(attempt, retry));
      }
    }

    throw new NetworkError("Token issuance failed after exhausting retries.");
  }

  private shouldRetry(
    error: unknown,
    attempt: number,
    maxAttempts: number,
  ): boolean {
    if (attempt >= maxAttempts) {
      return false;
    }

    if (error instanceof NetworkError) {
      return true;
    }

    if (error instanceof QredexError) {
      return isRetryableStatus(error.status);
    }

    return false;
  }
}
