/**
 *    ▄▄▄▄
 *  ▄█▀▀███▄▄              █▄
 *  ██    ██ ▄             ██
 *  ██    ██ ████▄▄█▀█▄ ▄████ █▀█▄▀██ ██▀
 *  ██  ▄ ██ ██   ██▄█▀ ██ ██ ██▄█▀  ███
 *   ▀█████▄▄█▀  ▄▀█▄▄▄█▀███▄▀█▄▄▄██ ██
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

export interface QredexErrorDetails {
  status?: number;
  errorCode?: string;
  requestId?: string;
  traceId?: string;
  responseBody?: unknown;
  responseText?: string;
  cause?: unknown;
}

export class QredexError extends Error {
  readonly status?: number;
  readonly errorCode?: string;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly responseBody?: unknown;
  readonly responseText?: string;
  declare readonly cause?: unknown;

  constructor(message: string, details: QredexErrorDetails = {}) {
    super(message);
    this.name = new.target.name;
    this.status = details.status;
    this.errorCode = details.errorCode;
    this.requestId = details.requestId;
    this.traceId = details.traceId;
    this.responseBody = details.responseBody;
    this.responseText = details.responseText;
    this.cause = details.cause;
  }
}

export class ConfigurationError extends QredexError {}

export class ApiError extends QredexError {}

export class AuthenticationError extends ApiError {}

export class AuthorizationError extends ApiError {}

export class ValidationError extends ApiError {}

export class ConflictError extends ApiError {}

export class RateLimitError extends ApiError {
  readonly retryAfterSeconds?: number;

  constructor(
    message: string,
    details: QredexErrorDetails & { retryAfterSeconds?: number } = {},
  ) {
    super(message, details);
    this.retryAfterSeconds = details.retryAfterSeconds;
  }
}

export class NetworkError extends QredexError {}

export function isQredexError(error: unknown): error is QredexError {
  return error instanceof QredexError;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}
