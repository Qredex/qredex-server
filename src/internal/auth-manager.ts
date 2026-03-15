import { ConfigurationError, NetworkError, QredexError } from "../errors";
import { MemoryTokenCache } from "../token-cache";
import type {
  CachedAccessToken,
  ClientCredentialsAuthOptions,
  IssueTokenRequest,
  OAuthTokenResponse,
  QredexAuthOptions,
  QredexCallOptions,
  QredexLogger,
  QredexTokenCache,
} from "../types";
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
import { Transport } from "./transport";

export class AuthManager {
  private readonly auth: QredexAuthOptions;
  private readonly transport: Transport;
  private readonly logger?: QredexLogger;
  private readonly refreshWindowMs: number;
  private readonly tokenCache: QredexTokenCache | null;
  private inFlightToken?: Promise<CachedAccessToken>;

  constructor(options: {
    auth: QredexAuthOptions;
    transport: Transport;
    logger?: QredexLogger;
  }) {
    this.auth = options.auth;
    this.transport = options.transport;
    this.logger = options.logger;
    this.refreshWindowMs = isClientCredentialsAuth(this.auth)
      ? Math.max(0, this.auth.refreshWindowMs ?? 30_000)
      : 0;
    this.tokenCache = isClientCredentialsAuth(this.auth)
      ? this.auth.tokenCache ?? new MemoryTokenCache()
      : null;
  }

  async getAuthorizationHeader(
    callOptions?: QredexCallOptions,
  ): Promise<string> {
    if (isAccessTokenAuth(this.auth)) {
      const token = await resolveAccessToken(this.auth.accessToken);
      if (!token) {
        throw new ConfigurationError("Qredex accessToken resolved to an empty value.");
      }

      return `Bearer ${token}`;
    }

    const cachedToken = await this.getCachedToken();
    if (cachedToken && cachedToken.expiresAtMs - this.refreshWindowMs > Date.now()) {
      return `${cachedToken.tokenType} ${cachedToken.accessToken}`;
    }

    if (!this.inFlightToken) {
      const pending = this.fetchToken(
        normalizeScope(this.auth.scope),
        callOptions,
        true,
      ).then(({ cachedToken }) => cachedToken);
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
    const auth = this.requireClientCredentialsAuth();
    const scope = normalizeScope(request.scope) ?? normalizeScope(auth.scope);
    const cacheResult = scopesEqual(scope, auth.scope);
    const { response } = await this.fetchToken(scope, callOptions, cacheResult);
    return response;
  }

  async clearTokenCache(): Promise<void> {
    if (!isClientCredentialsAuth(this.auth)) {
      return;
    }

    this.inFlightToken = undefined;
    await this.tokenCache?.clear();
  }

  private requireClientCredentialsAuth(): ClientCredentialsAuthOptions {
    if (!isClientCredentialsAuth(this.auth)) {
      throw new ConfigurationError(
        "Token issuance requires client credentials auth configuration.",
      );
    }

    return this.auth;
  }

  private async fetchToken(
    requestedScope: string | undefined,
    callOptions: QredexCallOptions | undefined,
    cacheResult: boolean,
  ): Promise<{ response: OAuthTokenResponse; cachedToken: CachedAccessToken }> {
    const auth = this.requireClientCredentialsAuth();
    const retry = clampRetryPolicy(auth.retry);

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
              auth.clientId,
              auth.clientSecret,
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
          await this.tokenCache?.set(cachedToken);
        }

        const event = {
          token_type: cachedToken.tokenType,
          expires_in: response.expires_in,
          scope: response.scope,
          issued_at: toIsoDate(issuedAtMs),
          expires_at: toIsoDate(cachedToken.expiresAtMs),
        };

        this.logger?.info?.("qredex.auth.token_issued", {
          expiresAt: event.expires_at,
          scope: event.scope,
          tokenType: event.token_type,
        });
        await auth.onTokenIssued?.(event);

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

  private async getCachedToken(): Promise<CachedAccessToken | null> {
    if (!isClientCredentialsAuth(this.auth)) {
      return null;
    }

    return this.tokenCache?.get() ?? null;
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
