import type { QredexCallOptions } from "../types";
import { AuthManager } from "./auth-manager";
import { Transport, type TransportRequest } from "./transport";

export class HttpClient {
  constructor(
    private readonly transport: Transport,
    private readonly authManager: AuthManager,
  ) {}

  async request<T>(
    request: Omit<TransportRequest, "headers"> & {
      headers?: Record<string, string | undefined>;
      callOptions?: QredexCallOptions;
    },
  ): Promise<T> {
    const authorization = await this.authManager.getAuthorizationHeader(
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
