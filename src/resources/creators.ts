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
