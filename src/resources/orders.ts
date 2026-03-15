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
  ListOrdersRequest,
  OrderAttributionDetailsResponse,
  OrderAttributionPageResponse,
  OrderAttributionResponse,
  RecordPaidOrderRequest,
} from "../models";
import type { QredexCallOptions } from "../types";
import { ValidationError } from "../errors";
import { HttpClient } from "../internal/http-client";
import {
  validateListOrdersRequest,
  validateOrderAttributionId,
  validateRecordPaidOrderRequest,
} from "../internal/validation";

export class OrdersClient {
  constructor(private readonly http: HttpClient) {}

  async list(
    request: ListOrdersRequest = {},
    options?: QredexCallOptions,
  ): Promise<OrderAttributionPageResponse> {
    try {
      validateListOrdersRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("orders.list", error);
      }
      throw error;
    }

    return this.http.request<OrderAttributionPageResponse>({
      method: "GET",
      path: "/api/v1/integrations/orders",
      query: request,
      callOptions: options,
    });
  }

  async getDetails(
    orderAttributionId: string,
    options?: QredexCallOptions,
  ): Promise<OrderAttributionDetailsResponse> {
    try {
      validateOrderAttributionId(orderAttributionId);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("orders.getDetails", error);
      }
      throw error;
    }

    return this.http.request<OrderAttributionDetailsResponse>({
      method: "GET",
      path: `/api/v1/integrations/orders/${encodeURIComponent(orderAttributionId)}/details`,
      callOptions: options,
    });
  }

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
