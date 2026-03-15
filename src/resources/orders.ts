import type { OrderAttributionResponse, RecordPaidOrderRequest } from "../models";
import type { QredexCallOptions } from "../types";
import { ValidationError } from "../errors";
import { HttpClient } from "../internal/http-client";
import { validateRecordPaidOrderRequest } from "../internal/validation";

export class OrdersClient {
  constructor(private readonly http: HttpClient) {}

  async recordPaidOrder(
    request: RecordPaidOrderRequest,
    options?: QredexCallOptions,
  ): Promise<OrderAttributionResponse> {
    try {
      validateRecordPaidOrderRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("orders.recordPaidOrder", error);
      }
      throw error;
    }
    return this.http.request<OrderAttributionResponse>({
      method: "POST",
      path: "/api/v1/integrations/orders/paid",
      body: request,
      callOptions: options,
    });
  }
}
