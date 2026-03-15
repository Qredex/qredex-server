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

export class LinksClient {
  constructor(private readonly http: HttpClient) {}

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
