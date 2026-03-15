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

import {
  ApiError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  RateLimitError,
  ValidationError,
} from "../errors";

interface ApiErrorFactoryInput {
  status: number;
  errorCode?: string;
  message: string;
  requestId?: string;
  traceId?: string;
  responseBody?: unknown;
  responseText?: string;
  retryAfterSeconds?: number;
}

export function createApiError(input: ApiErrorFactoryInput): ApiError {
  const details = {
    status: input.status,
    errorCode: input.errorCode,
    requestId: input.requestId,
    traceId: input.traceId,
    responseBody: input.responseBody,
    responseText: input.responseText,
  };

  if (input.status === 400) {
    return new ValidationError(input.message, details);
  }

  if (input.status === 401) {
    return new AuthenticationError(input.message, details);
  }

  if (input.status === 403) {
    return new AuthorizationError(input.message, details);
  }

  if (input.status === 409) {
    return new ConflictError(input.message, details);
  }

  if (input.status === 429) {
    return new RateLimitError(input.message, {
      ...details,
      retryAfterSeconds: input.retryAfterSeconds,
    });
  }

  return new ApiError(input.message, details);
}
