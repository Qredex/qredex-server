import type {
  CreateAndLockPurchaseIntentRequest,
  InfluenceIntentResponse,
  IssueInfluenceIntentTokenRequest,
  PurchaseIntentResponse,
} from "../models";
import type { QredexCallOptions } from "../types";
import { ValidationError } from "../errors";
import { HttpClient } from "../internal/http-client";
import {
  validateIssueInfluenceIntentTokenRequest,
  validateLockPurchaseIntentRequest,
} from "../internal/validation";

export class IntentsClient {
  constructor(private readonly http: HttpClient) {}

  async issueInfluenceIntentToken(
    request: IssueInfluenceIntentTokenRequest,
    options?: QredexCallOptions,
  ): Promise<InfluenceIntentResponse> {
    try {
      validateIssueInfluenceIntentTokenRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure(
          "intents.issueInfluenceIntentToken",
          error,
        );
      }
      throw error;
    }
    return this.http.request<InfluenceIntentResponse>({
      method: "POST",
      path: "/api/v1/integrations/intents/token",
      body: request,
      callOptions: options,
    });
  }

  async lockPurchaseIntent(
    request: CreateAndLockPurchaseIntentRequest,
    options?: QredexCallOptions,
  ): Promise<PurchaseIntentResponse> {
    try {
      validateLockPurchaseIntentRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("intents.lockPurchaseIntent", error);
      }
      throw error;
    }
    return this.http.request<PurchaseIntentResponse>({
      method: "POST",
      path: "/api/v1/integrations/intents/lock",
      body: request,
      callOptions: options,
    });
  }
}
