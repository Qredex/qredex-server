/**
 *    ▄▄▄▄
 *  ▄█▀▀███▄▄              █▄
 *  ██    ██ ▄             ██
 *  ██    ██ ████▄▄█▀█▄ ▄████ ▄█▀█▄▀██ ██▀
 *  ██  ▄ ██ ██   ██▄█▀ ██ ██ ██▄█▀  ███
 *   ▀█████▄▄█▀  ▄▀█▄▄▄▄█▀███▄▀█▄▄▄▄██ ██▄
 *        ▀█
 *
 *  Copyright (C) 2026 — 2026, Qredex, LTD. All Rights Reserved.
 *
 *  DO NOT ALTER OR REMOVE COPYRIGHT NOTICES OR THIS FILE HEADER.
 *
 *  Licensed under the Apache License, Version 2.0. See LICENSE for the full license text.
 *  You may not use this file except in compliance with that License.
 *  Unless required by applicable law or agreed to in writing, software distributed under the
 *  License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 *  either express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 *
 *  If you need additional information or have any questions, please email: copyright@qredex.com
 */

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
import { resolveClientBaseUrl, validateQredexOptions } from "./internal/validation";
import { CreatorsClient } from "./resources/creators";
import { IntentsClient } from "./resources/intents";
import { LinksClient } from "./resources/links";
import { OrdersClient } from "./resources/orders";
import { RefundsClient } from "./resources/refunds";

/** Auth helper surface for explicit token issuance and cache control. */
export class QredexAuthClient {
  constructor(private readonly tokenProvider: TokenProvider) {}

  /** Issues a client-credentials token explicitly on the current client configuration. */
  async issueToken(
    request: IssueTokenRequest = {},
    options?: QredexCallOptions,
  ): Promise<OAuthTokenResponse> {
    return this.tokenProvider.issueToken(request, options);
  }

  /** Clears the configured token cache so the next auth call fetches a fresh token. */
  async clearTokenCache(): Promise<void> {
    return this.tokenProvider.clearTokenCache();
  }
}

/** Public entrypoint for the Qredex Integrations API server SDK. */
export class Qredex {
  readonly auth: QredexAuthClient;
  readonly creators: CreatorsClient;
  readonly events: QredexEventSubscriber;
  readonly links: LinksClient;
  readonly intents: IntentsClient;
  readonly orders: OrdersClient;
  readonly refunds: RefundsClient;

  /** Creates a client from explicit configuration and fails fast on invalid options. */
  static init(options: QredexOptions): Qredex {
    return new Qredex(options);
  }

  /**
   * Creates a client from environment variables.
   * Reads `QREDEX_CLIENT_ID`, `QREDEX_CLIENT_SECRET`, optional `QREDEX_SCOPE`,
   * and optional `QREDEX_ENVIRONMENT`, then validates the resulting configuration eagerly.
   */
  static bootstrap(
    env: NodeJS.ProcessEnv = process.env,
    overrides: Omit<QredexOptions, "auth" | "environment"> = {},
  ): Qredex {
    const clientId = env.QREDEX_CLIENT_ID?.trim();
    const clientSecret = env.QREDEX_CLIENT_SECRET?.trim();
    const rawScope = env.QREDEX_SCOPE?.trim();
    const rawEnvironment = env.QREDEX_ENVIRONMENT?.trim();

    if (!clientId) {
      throw new ConfigurationError("Qredex.bootstrap requires QREDEX_CLIENT_ID.");
    }

    if (!clientSecret) {
      throw new ConfigurationError("Qredex.bootstrap requires QREDEX_CLIENT_SECRET.");
    }

    if (
      rawEnvironment &&
      !["production", "staging", "development"].includes(rawEnvironment)
    ) {
      throw new ConfigurationError(
        "Qredex.bootstrap requires QREDEX_ENVIRONMENT to be 'production', 'staging', or 'development'.",
      );
    }

    const environment = (
      rawEnvironment ??
      "production"
    ) as QredexOptions["environment"];
    const scope = rawScope
      ? rawScope
          .split(/[\s,]+/)
          .map((value) => value.trim())
          .filter(Boolean)
          .join(" ")
      : undefined;

    return Qredex.init({
      ...overrides,
      environment,
      auth: {
        clientId,
        clientSecret,
        ...(scope ? { scope } : {}),
      },
    });
  }

  private constructor(options: QredexOptions) {
    validateQredexOptions(options);

    const clock: QredexClock = options.clock ?? {
      now: () => Date.now(),
    };

    const eventBus = new QredexEventBus(options.logger, [
      ...(options.onEvent ? [options.onEvent] : []),
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
    this._eventBus = eventBus;
    this._tokenProvider = tokenProvider;
  }

  private readonly _eventBus: QredexEventBus;
  private readonly _tokenProvider: TokenProvider;

  /**
   * Releases all internal resources: clears event handlers, hooks, and token cache.
   * After calling destroy(), this client instance must not be reused.
   */
  async destroy(): Promise<void> {
    this._eventBus.destroy();
    await this._tokenProvider.clearTokenCache();
  }
}
