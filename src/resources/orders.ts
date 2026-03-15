import type { OrderAttributionResponse, RecordPaidOrderRequest } from "../models";
import type { QredexCallOptions } from "../types";
import { HttpClient } from "../internal/http-client";

export class OrdersClient {
  constructor(private readonly http: HttpClient) {}

  async recordPaidOrder(
    request: RecordPaidOrderRequest,
    options?: QredexCallOptions,
  ): Promise<OrderAttributionResponse> {
    return this.http.request<OrderAttributionResponse>({
      method: "POST",
      path: "/api/v1/integrations/orders/paid",
      body: request,
      callOptions: options,
    });
  }
}
