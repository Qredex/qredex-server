import { ConfigurationError } from "./errors";
import type { OAuthTokenResponse } from "./types";
import type {
  IssueTokenRequest,
  QredexCallOptions,
  QredexClientOptions,
} from "./types";
import { AuthManager } from "./internal/auth-manager";
import { HttpClient } from "./internal/http-client";
import { Transport } from "./internal/transport";
import { normalizeBaseUrl } from "./internal/utils";
import { CreatorsClient } from "./resources/creators";
import { IntentsClient } from "./resources/intents";
import { LinksClient } from "./resources/links";
import { OrdersClient } from "./resources/orders";
import { RefundsClient } from "./resources/refunds";

export class QredexAuthClient {
  constructor(private readonly authManager: AuthManager) {}

  async issueToken(
    request: IssueTokenRequest = {},
    options?: QredexCallOptions,
  ): Promise<OAuthTokenResponse> {
    return this.authManager.issueToken(request, options);
  }

  async clearTokenCache(): Promise<void> {
    return this.authManager.clearTokenCache();
  }
}

export class QredexClient {
  readonly auth: QredexAuthClient;
  readonly creators: CreatorsClient;
  readonly links: LinksClient;
  readonly intents: IntentsClient;
  readonly orders: OrdersClient;
  readonly refunds: RefundsClient;

  constructor(options: QredexClientOptions) {
    if (!options.baseUrl) {
      throw new ConfigurationError("QredexClient requires a baseUrl.");
    }

    if (!options.auth) {
      throw new ConfigurationError("QredexClient requires auth configuration.");
    }

    const transport = new Transport({
      baseUrl: normalizeBaseUrl(options.baseUrl),
      fetch: options.fetch ?? fetch,
      timeoutMs: options.timeoutMs ?? 10_000,
      logger: options.logger,
      defaultHeaders: options.defaultHeaders,
      userAgentSuffix: options.userAgentSuffix,
    });
    const authManager = new AuthManager({
      auth: options.auth,
      transport,
      logger: options.logger,
    });
    const http = new HttpClient(transport, authManager);

    this.auth = new QredexAuthClient(authManager);
    this.creators = new CreatorsClient(http);
    this.links = new LinksClient(http);
    this.intents = new IntentsClient(http);
    this.orders = new OrdersClient(http);
    this.refunds = new RefundsClient(http);
  }
}
