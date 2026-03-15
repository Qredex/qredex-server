import type { QredexCallOptions } from "../types";
import { Transport, type TransportRequest } from "./transport";
import type { TokenProvider } from "./token-provider";

export class HttpClient {
  constructor(
    private readonly transport: Transport,
    private readonly tokenProvider: TokenProvider,
  ) {}

  async request<T>(
    request: Omit<TransportRequest, "headers"> & {
      headers?: Record<string, string | undefined>;
      callOptions?: QredexCallOptions;
    },
  ): Promise<T> {
    const authorization = await this.tokenProvider.getAuthorizationHeader(
      request.callOptions,
    );

    return this.transport.request<T>({
      ...request,
      headers: {
        ...request.headers,
        authorization,
      },
    });
  }
}
