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

import { ConfigurationError, ValidationError } from "../errors";
import { QredexHeader } from "../headers";
import type {
  CreateAndLockPurchaseIntentRequest,
  CreateCreatorRequest,
  CreateLinkRequest,
  GetCreatorRequest,
  GetLinkRequest,
  IssueInfluenceIntentTokenRequest,
  ListCreatorsRequest,
  ListLinksRequest,
  ListOrdersRequest,
  RecordPaidOrderRequest,
  RecordRefundRequest,
} from "../models";
import type {
  AccessTokenAuthOptions,
  ClientCredentialsAuthOptions,
  QredexCallOptions,
  QredexEnvironment,
  QredexOptions,
  QredexRetryPolicy,
} from "../types";
import { normalizeBaseUrl } from "./utils";

const ALLOWED_ATTRIBUTION_WINDOWS = new Set([1, 3, 7, 14, 30]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const RESERVED_HEADER_NAMES = new Set([
  "accept",
  "authorization",
  "content-type",
  "idempotency-key",
  "user-agent",
  QredexHeader.REQUEST_ID,
  QredexHeader.TRACE_ID,
  QredexHeader.SDK,
]);
const ENVIRONMENT_BASE_URLS: Record<QredexEnvironment, string> = {
  production: "https://api.qredex.com",
  staging: "https://staging-api.qredex.com",
  development: "http://localhost:8080",
};

function sdkValidation(message: string): never {
  throw new ValidationError(message, {
    errorCode: "sdk_validation_error",
  });
}

function configValidation(message: string): never {
  throw new ConfigurationError(message, {
    errorCode: "sdk_configuration_error",
  });
}

function assertNonEmptyString(field: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    sdkValidation(`${field} must be a non-empty string.`);
  }
}

function assertConfigNonEmptyString(field: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    configValidation(`${field} must be a non-empty string.`);
  }
}

function assertUuid(field: string, value: unknown): asserts value is string {
  assertNonEmptyString(field, value);
  if (!UUID_PATTERN.test(value)) {
    sdkValidation(`${field} must be a valid UUID.`);
  }
}

function assertOptionalNonEmptyString(field: string, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }

  assertNonEmptyString(field, value);
}

function assertOptionalIsoDateTime(field: string, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }

  assertNonEmptyString(field, value);
  if (!ISO_DATE_TIME_PATTERN.test(value)) {
    sdkValidation(`${field} must be an ISO 8601 UTC timestamp.`);
  }
}

function assertOptionalFiniteNumber(field: string, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    sdkValidation(`${field} must be a finite number when provided.`);
  }
}

function assertOptionalNonNegativeNumber(field: string, value: unknown): void {
  assertOptionalFiniteNumber(field, value);
  if (typeof value === "number" && value < 0) {
    sdkValidation(`${field} must be greater than or equal to 0.`);
  }
}

function assertOptionalPageSize(field: string, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }

  if (!Number.isInteger(value) || (value as number) < 0) {
    sdkValidation(`${field} must be an integer greater than or equal to 0.`);
  }
}

function assertPositiveFiniteNumber(
  field: string,
  value: unknown,
  errorFactory: (message: string) => never,
): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    errorFactory(`${field} must be a positive finite number.`);
  }
}

function assertOptionalNonNegativeFiniteNumber(
  field: string,
  value: unknown,
  errorFactory: (message: string) => never,
): void {
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    errorFactory(`${field} must be a finite number greater than or equal to 0.`);
  }
}

function assertOptionalPositiveInteger(
  field: string,
  value: unknown,
  errorFactory: (message: string) => never,
): void {
  if (value === undefined || value === null) {
    return;
  }

  if (!Number.isInteger(value) || (value as number) <= 0) {
    errorFactory(`${field} must be a positive integer when provided.`);
  }
}

function assertNoReservedHeaders(
  headers: Record<string, string> | undefined,
  location: "defaultHeaders" | "callOptions.headers",
  errorFactory: (message: string) => never,
): void {
  if (!headers) {
    return;
  }

  for (const key of Object.keys(headers)) {
    const normalized = key.trim().toLowerCase();

    if (!normalized) {
      continue;
    }

    if (!RESERVED_HEADER_NAMES.has(normalized)) {
      continue;
    }

    if (normalized === QredexHeader.REQUEST_ID) {
      errorFactory(`${location} cannot override '${QredexHeader.REQUEST_ID}'. Use requestId instead.`);
    }

    if (normalized === QredexHeader.TRACE_ID) {
      errorFactory(`${location} cannot override '${QredexHeader.TRACE_ID}'. Use traceId instead.`);
    }

    if (normalized === "idempotency-key") {
      errorFactory(`${location} cannot override 'idempotency-key'. Use idempotencyKey instead.`);
    }

    if (normalized === "user-agent") {
      errorFactory(`${location} cannot override 'user-agent'. Use userAgentSuffix instead.`);
    }

    errorFactory(`${location} cannot override reserved header '${normalized}'.`);
  }
}

function validateRetryPolicy(
  retry: QredexRetryPolicy | undefined,
  fieldPrefix: string,
): void {
  if (!retry) {
    return;
  }

  assertOptionalPositiveInteger(`${fieldPrefix}.maxAttempts`, retry.maxAttempts, configValidation);
  assertOptionalNonNegativeFiniteNumber(
    `${fieldPrefix}.baseDelayMs`,
    retry.baseDelayMs,
    configValidation,
  );
  assertOptionalNonNegativeFiniteNumber(
    `${fieldPrefix}.maxDelayMs`,
    retry.maxDelayMs,
    configValidation,
  );
}

function validateClientCredentialsAuthOptions(
  auth: ClientCredentialsAuthOptions,
): void {
  assertConfigNonEmptyString("auth.clientId", auth.clientId);
  assertConfigNonEmptyString("auth.clientSecret", auth.clientSecret);
  assertOptionalNonNegativeFiniteNumber(
    "auth.refreshWindowMs",
    auth.refreshWindowMs,
    configValidation,
  );
  validateRetryPolicy(auth.retry, "auth.retry");
}

function validateAccessTokenAuthOptions(auth: AccessTokenAuthOptions): void {
  if (typeof auth.accessToken === "string") {
    assertConfigNonEmptyString("auth.accessToken", auth.accessToken);
  }
}

export function validateQredexOptions(options: QredexOptions): void {
  if (!options.auth) {
    configValidation("Qredex requires auth configuration.");
  }

  if (
    options.environment !== undefined &&
    !["production", "staging", "development"].includes(options.environment)
  ) {
    configValidation(
      "Qredex environment must be 'production', 'staging', or 'development'.",
    );
  }

  if (options.timeoutMs !== undefined) {
    assertPositiveFiniteNumber("timeoutMs", options.timeoutMs, configValidation);
  }

  assertNoReservedHeaders(options.defaultHeaders, "defaultHeaders", configValidation);
  validateRetryPolicy(options.readRetry, "readRetry");

  if (options.auth.type === "access_token") {
    validateAccessTokenAuthOptions(options.auth);
    return;
  }

  validateClientCredentialsAuthOptions(options.auth);
}

export function validateCallOptions(callOptions?: QredexCallOptions): void {
  if (!callOptions) {
    return;
  }

  if (callOptions.timeoutMs !== undefined) {
    assertPositiveFiniteNumber("timeoutMs", callOptions.timeoutMs, sdkValidation);
  }

  assertNoReservedHeaders(callOptions.headers, "callOptions.headers", sdkValidation);
}

export function resolveClientBaseUrl(options: QredexOptions): string {
  const baseUrl = ENVIRONMENT_BASE_URLS[options.environment ?? "production"];

  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new ConfigurationError("Qredex baseUrl must be a valid URL.");
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    throw new ConfigurationError(
      "Qredex baseUrl must use http or https.",
    );
  }

  return normalizeBaseUrl(url.toString());
}

export function validateCreateCreatorRequest(request: CreateCreatorRequest): void {
  assertNonEmptyString("handle", request.handle);
  assertOptionalNonEmptyString("display_name", request.display_name);
  assertOptionalNonEmptyString("email", request.email);
}

export function validateGetCreatorRequest(request: GetCreatorRequest): void {
  assertUuid("creator_id", request.creator_id);
}

export function validateListCreatorsRequest(request: ListCreatorsRequest): void {
  assertOptionalPageSize("page", request.page);
  assertOptionalPageSize("size", request.size);
}

export function validateCreateLinkRequest(request: CreateLinkRequest): void {
  assertUuid("store_id", request.store_id);
  assertUuid("creator_id", request.creator_id);
  assertNonEmptyString("link_name", request.link_name);
  assertNonEmptyString("destination_path", request.destination_path);

  if (!request.destination_path.startsWith("/")) {
    sdkValidation("destination_path must start with '/'.");
  }

  assertOptionalNonEmptyString("note", request.note);
  assertOptionalIsoDateTime("link_expiry_at", request.link_expiry_at);
  assertOptionalNonEmptyString("discount_code", request.discount_code);

  if (
    request.attribution_window_days !== undefined &&
    request.attribution_window_days !== null &&
    !ALLOWED_ATTRIBUTION_WINDOWS.has(request.attribution_window_days)
  ) {
    sdkValidation("attribution_window_days must be one of 1, 3, 7, 14, or 30.");
  }
}

export function validateGetLinkRequest(request: GetLinkRequest): void {
  assertUuid("link_id", request.link_id);
}

export function validateListLinksRequest(request: ListLinksRequest): void {
  assertOptionalPageSize("page", request.page);
  assertOptionalPageSize("size", request.size);
  assertOptionalNonEmptyString("destination", request.destination);
}

export function validateIssueInfluenceIntentTokenRequest(
  request: IssueInfluenceIntentTokenRequest,
): void {
  assertUuid("link_id", request.link_id);
  assertOptionalNonEmptyString("ip_hash", request.ip_hash);
  assertOptionalNonEmptyString("user_agent_hash", request.user_agent_hash);
  assertOptionalNonEmptyString("referrer", request.referrer);
  assertOptionalNonEmptyString("landing_path", request.landing_path);
  assertOptionalIsoDateTime("expires_at", request.expires_at);
}

export function validateLockPurchaseIntentRequest(
  request: CreateAndLockPurchaseIntentRequest,
): void {
  assertNonEmptyString("token", request.token);
  assertOptionalNonEmptyString("source", request.source);
}

export function validateRecordPaidOrderRequest(
  request: RecordPaidOrderRequest,
): void {
  assertUuid("store_id", request.store_id);
  assertNonEmptyString("external_order_id", request.external_order_id);
  assertNonEmptyString("currency", request.currency);

  if (!CURRENCY_PATTERN.test(request.currency)) {
    sdkValidation("currency must be a 3-letter uppercase ISO code.");
  }

  assertOptionalNonEmptyString("order_number", request.order_number);
  assertOptionalIsoDateTime("paid_at", request.paid_at);
  assertOptionalNonNegativeNumber("subtotal_price", request.subtotal_price);
  assertOptionalNonNegativeNumber("discount_total", request.discount_total);
  assertOptionalNonNegativeNumber("total_price", request.total_price);
  assertOptionalNonEmptyString("customer_email_hash", request.customer_email_hash);
  assertOptionalNonEmptyString("checkout_token", request.checkout_token);
  assertOptionalNonEmptyString(
    "purchase_intent_token",
    request.purchase_intent_token,
  );
}

export function validateRecordRefundRequest(request: RecordRefundRequest): void {
  assertUuid("store_id", request.store_id);
  assertNonEmptyString("external_order_id", request.external_order_id);
  assertNonEmptyString("external_refund_id", request.external_refund_id);
  assertOptionalNonNegativeNumber("refund_total", request.refund_total);
  assertOptionalIsoDateTime("refunded_at", request.refunded_at);
}

export function validateListOrdersRequest(request: ListOrdersRequest): void {
  assertOptionalPageSize("page", request.page);
  assertOptionalPageSize("size", request.size);
}

export function validateOrderAttributionId(orderAttributionId: string): void {
  assertUuid("orderAttributionId", orderAttributionId);
}
