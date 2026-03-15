import { ConfigurationError } from "./errors";
import type { QredexEventSubscriber } from "./events";
import type { OAuthTokenResponse } from "./types";
import type {
  IssueTokenRequest,
  QredexCallOptions,
  QredexClock,
  QredexOptions,
} from "./types";
import { QredexEventBus } from "./internal/event-bus";
import { HttpClient } from "./internal/http-client";
import { createTokenProvider, type TokenProvider } from "./internal/token-provider";
import { Transport } from "./internal/transport";
import { resolveClientBaseUrl } from "./internal/validation";
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

export class Qredex {
  readonly auth: QredexAuthClient;
  readonly creators: CreatorsClient;
  readonly events: QredexEventSubscriber;
  readonly links: LinksClient;
  readonly intents: IntentsClient;
  readonly orders: OrdersClient;
  readonly refunds: RefundsClient;

  static init(options: QredexOptions): Qredex {
    return new Qredex(options);
  }

  static fromEnv(
    env: NodeJS.ProcessEnv = process.env,
    overrides: Omit<QredexOptions, "auth" | "environment"> = {},
  ): Qredex {
    const clientId = env.QREDEX_CLIENT_ID?.trim();
    const clientSecret = env.QREDEX_CLIENT_SECRET?.trim();
    const rawEnvironment = env.QREDEX_ENVIRONMENT?.trim();

    if (!clientId) {
      throw new ConfigurationError("Qredex.fromEnv requires QREDEX_CLIENT_ID.");
    }

    if (!clientSecret) {
      throw new ConfigurationError("Qredex.fromEnv requires QREDEX_CLIENT_SECRET.");
    }

    if (
      rawEnvironment &&
      !["production", "staging", "development"].includes(rawEnvironment)
    ) {
      throw new ConfigurationError(
        "Qredex.fromEnv requires QREDEX_ENVIRONMENT to be 'production', 'staging', or 'development'.",
      );
    }

    const environment = (
      rawEnvironment ??
      "production"
    ) as QredexOptions["environment"];

    return Qredex.init({
      ...overrides,
      environment,
      auth: {
        clientId,
        clientSecret,
      },
    });
  }

  private constructor(options: QredexOptions) {
    const clock: QredexClock = options.clock ?? {
      now: () => Date.now(),
    };

    if (!options.auth) {
      throw new ConfigurationError("Qredex requires auth configuration.");
    }

    const eventBus = new QredexEventBus(options.logger, [
      ...(options.onEvent ? [options.onEvent] : []),
      ...(options.onDebug ? [options.onDebug] : []),
    ]);

    const transport = new Transport({
      baseUrl: resolveClientBaseUrl(options),
      clock,
      eventBus,
      fetch: options.fetch ?? fetch,
      timeoutMs: options.timeoutMs ?? 10_000,
      logger: options.logger,
      defaultHeaders: options.defaultHeaders,
      userAgentSuffix: options.userAgentSuffix,
    });
    const tokenProvider = createTokenProvider({
      auth: options.auth,
      clock,
      eventBus,
      transport,
      logger: options.logger,
    });
    const http = new HttpClient(
      eventBus,
      options.logger,
      options.readRetry,
      transport,
      tokenProvider,
    );

    this.auth = new QredexAuthClient(tokenProvider);
    this.events = eventBus;
    this.creators = new CreatorsClient(http);
    this.links = new LinksClient(http);
    this.intents = new IntentsClient(http);
    this.orders = new OrdersClient(http);
    this.refunds = new RefundsClient(http);
  }
}
