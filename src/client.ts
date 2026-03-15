import { ConfigurationError } from "./errors";
import type { OAuthTokenResponse } from "./types";
import type {
  IssueTokenRequest,
  QredexCallOptions,
  QredexClientOptions,
} from "./types";
import { HttpClient } from "./internal/http-client";
import { createTokenProvider, type TokenProvider } from "./internal/token-provider";
import { Transport } from "./internal/transport";
import { normalizeBaseUrl } from "./internal/utils";
import { validateClientConfiguration } from "./internal/validation";
import { CreatorsClient } from "./resources/creators";
import { IntentsClient } from "./resources/intents";
import { LinksClient } from "./resources/links";
import { OrdersClient } from "./resources/orders";
import { RefundsClient } from "./resources/refunds";

export class QredexAuthClient {
  constructor(private readonly tokenProvider: TokenProvider) {}

  async issueToken(
    request: IssueTokenRequest = {},
    options?: QredexCallOptions,
  ): Promise<OAuthTokenResponse> {
    return this.tokenProvider.issueToken(request, options);
  }

  async clearTokenCache(): Promise<void> {
    return this.tokenProvider.clearTokenCache();
  }
}

export class QredexClient {
  readonly auth: QredexAuthClient;
  readonly creators: CreatorsClient;
  readonly links: LinksClient;
  readonly intents: IntentsClient;
  readonly orders: OrdersClient;
  readonly refunds: RefundsClient;

  static init(options: QredexClientOptions): QredexClient {
    return new QredexClient(options);
  }

  private constructor(options: QredexClientOptions) {
    validateClientConfiguration(options.baseUrl);

    if (!options.auth) {
      throw new ConfigurationError("QredexClient requires auth configuration.");
    }

    const transport = new Transport({
      baseUrl: normalizeBaseUrl(options.baseUrl),
      fetch: options.fetch ?? fetch,
      timeoutMs: options.timeoutMs ?? 10_000,
      logger: options.logger,
      onDebug: options.onDebug,
      defaultHeaders: options.defaultHeaders,
      userAgentSuffix: options.userAgentSuffix,
    });
    const tokenProvider = createTokenProvider({
      auth: options.auth,
      transport,
      logger: options.logger,
      onDebug: options.onDebug,
    });
    const http = new HttpClient(transport, tokenProvider);

    this.auth = new QredexAuthClient(tokenProvider);
    this.creators = new CreatorsClient(http);
    this.links = new LinksClient(http);
    this.intents = new IntentsClient(http);
    this.orders = new OrdersClient(http);
    this.refunds = new RefundsClient(http);
  }
}
