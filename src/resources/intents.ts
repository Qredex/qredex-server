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
