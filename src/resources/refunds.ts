import type { OrderAttributionResponse, RecordRefundRequest } from "../models";
import type { QredexCallOptions } from "../types";
import { ValidationError } from "../errors";
import { HttpClient } from "../internal/http-client";
import { validateRecordRefundRequest } from "../internal/validation";

export class RefundsClient {
  constructor(private readonly http: HttpClient) {}

  async recordRefund(
    request: RecordRefundRequest,
    options?: QredexCallOptions,
  ): Promise<OrderAttributionResponse> {
    try {
      validateRecordRefundRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("refunds.recordRefund", error);
      }
      throw error;
    }
    return this.http.request<OrderAttributionResponse>({
      method: "POST",
      path: "/api/v1/integrations/orders/refund",
      body: request,
      callOptions: options,
    });
  }
}
