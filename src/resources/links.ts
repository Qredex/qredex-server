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
  CreateLinkRequest,
  GetLinkRequest,
  LinkPageResponse,
  LinkResponse,
  ListLinksRequest,
} from "../models";
import type { QredexCallOptions } from "../types";
import { ValidationError } from "../errors";
import { HttpClient } from "../internal/http-client";
import {
  validateCreateLinkRequest,
  validateGetLinkRequest,
  validateListLinksRequest,
} from "../internal/validation";

/** Link resource operations for the Integrations API. */
export class LinksClient {
  constructor(private readonly http: HttpClient) {}

  /** Creates a trackable link for a creator and store. */
  async create(
    request: CreateLinkRequest,
    options?: QredexCallOptions,
  ): Promise<LinkResponse> {
    try {
      validateCreateLinkRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("links.create", error);
      }
      throw error;
    }
    return this.http.request<LinkResponse>({
      method: "POST",
      path: "/api/v1/integrations/links",
      body: request,
      callOptions: options,
    });
  }

  /** Fetches a single link by `link_id`. */
  async get(
    request: GetLinkRequest,
    options?: QredexCallOptions,
  ): Promise<LinkResponse> {
    try {
      validateGetLinkRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("links.get", error);
      }
      throw error;
    }
    return this.http.request<LinkResponse>({
      method: "GET",
      path: `/api/v1/integrations/links/${request.link_id}`,
      callOptions: options,
    });
  }

  /** Lists links with optional filters and pagination. */
  async list(
    request: ListLinksRequest = {},
    options?: QredexCallOptions,
  ): Promise<LinkPageResponse> {
    try {
      validateListLinksRequest(request);
    } catch (error) {
      if (error instanceof ValidationError) {
        return this.http.reportValidationFailure("links.list", error);
      }
      throw error;
    }
    return this.http.request<LinkPageResponse>({
      method: "GET",
      path: "/api/v1/integrations/links",
      query: request,
      callOptions: options,
    });
  }
}
