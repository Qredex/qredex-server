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

/** Common structured metadata preserved on SDK errors. */
export interface QredexErrorDetails {
  status?: number;
  errorCode?: string;
  requestId?: string;
  traceId?: string;
  responseBody?: unknown;
  responseText?: string;
  cause?: unknown;
}

/** Base SDK error with preserved HTTP and Qredex metadata where available. */
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

/** Thrown when SDK configuration is invalid before a request is made. */
export class ConfigurationError extends QredexError {}

/** Base API error for non-network responses from Qredex. */
export class ApiError extends QredexError {}

/** API authentication failure, typically invalid credentials or token state. */
export class AuthenticationError extends ApiError {}

/** API authorization failure due to missing scope or denied access. */
export class AuthorizationError extends ApiError {}

/** SDK or API validation failure for invalid request input. */
export class ValidationError extends ApiError {}

/** API response indicating the requested resource was not found. */
export class NotFoundError extends ApiError {}

/** API conflict or policy rejection, such as duplicate or cross-source conflicts. */
export class ConflictError extends ApiError {}

/** API rate-limit response with optional `retry-after` metadata. */
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

/** Network or transport failure before a valid API response is received. */
export class NetworkError extends QredexError {}

/** Type guard for any Qredex SDK error. */
export function isQredexError(error: unknown): error is QredexError {
  return error instanceof QredexError;
}

/** Type guard for API-originated Qredex errors. */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Type guard for authentication failures. */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/** Type guard for authorization failures. */
export function isAuthorizationError(error: unknown): error is AuthorizationError {
  return error instanceof AuthorizationError;
}

/** Type guard for validation failures. */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/** Type guard for not-found failures. */
export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

/** Type guard for conflict or policy rejection failures. */
export function isConflictError(error: unknown): error is ConflictError {
  return error instanceof ConflictError;
}

/** Type guard for rate-limit failures. */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

/** Type guard for network failures. */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/** Type guard for configuration failures. */
export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}
