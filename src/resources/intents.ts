import type {
  CreateAndLockPurchaseIntentRequest,
  InfluenceIntentResponse,
  IssueInfluenceIntentTokenRequest,
  PurchaseIntentResponse,
} from "../models";
import type { QredexCallOptions } from "../types";
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
    validateIssueInfluenceIntentTokenRequest(request);
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
    validateLockPurchaseIntentRequest(request);
    return this.http.request<PurchaseIntentResponse>({
      method: "POST",
      path: "/api/v1/integrations/intents/lock",
      body: request,
      callOptions: options,
    });
  }
}
