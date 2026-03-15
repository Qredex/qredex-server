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
  CreateCreatorRequest,
  CreatorPageResponse,
  CreatorResponse,
  GetCreatorRequest,
  ListCreatorsRequest,
} from "../models";
import type { QredexCallOptions } from "../types";
import { ValidationError } from "../errors";
import { HttpClient } from "../internal/http-client";
import {
  validateCreateCreatorRequest,
  validateGetCreatorRequest,
  validateListCreatorsRequest,
} from "../internal/validation";

export class CreatorsClient {
  constructor(private readonly http: HttpClient) {}

  async create(
    request: CreateCreatorRequest,
    options?: QredexCallOptions,
  ): Promise<CreatorResponse> {
    try {
      validateCreateCreatorRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("creators.create", error);
      }
      throw error;
    }
    // Creator writes are part of the integrations contract in the auth/docs set,
    // even though the current OpenAPI file only documents GETs on this path.
    return this.http.request<CreatorResponse>({
      method: "POST",
      path: "/api/v1/integrations/creators",
      body: request,
      callOptions: options,
    });
  }

  async get(
    request: GetCreatorRequest,
    options?: QredexCallOptions,
  ): Promise<CreatorResponse> {
    try {
      validateGetCreatorRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("creators.get", error);
      }
      throw error;
    }
    return this.http.request<CreatorResponse>({
      method: "GET",
      path: `/api/v1/integrations/creators/${request.creator_id}`,
      callOptions: options,
    });
  }

  async list(
    request: ListCreatorsRequest = {},
    options?: QredexCallOptions,
  ): Promise<CreatorPageResponse> {
    try {
      validateListCreatorsRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("creators.list", error);
      }
      throw error;
    }
    return this.http.request<CreatorPageResponse>({
      method: "GET",
      path: "/api/v1/integrations/creators",
      query: request,
      callOptions: options,
    });
  }
}
