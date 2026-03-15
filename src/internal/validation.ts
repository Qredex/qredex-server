import { ConfigurationError, ValidationError } from "../errors";
import type {
  CreateAndLockPurchaseIntentRequest,
  CreateCreatorRequest,
  CreateLinkRequest,
  GetCreatorRequest,
  GetLinkRequest,
  IssueInfluenceIntentTokenRequest,
  ListCreatorsRequest,
  ListLinksRequest,
  RecordPaidOrderRequest,
  RecordRefundRequest,
} from "../models";
import type { QredexClientOptions, QredexEnvironment } from "../types";
import { normalizeBaseUrl } from "./utils";

const ALLOWED_ATTRIBUTION_WINDOWS = new Set([1, 3, 7, 14, 30]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
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

function assertNonEmptyString(field: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    sdkValidation(`${field} must be a non-empty string.`);
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

export function resolveClientBaseUrl(options: QredexClientOptions): string {
  const baseUrl = options.baseUrl ?? ENVIRONMENT_BASE_URLS[options.environment ?? "production"];

  let url: URL;

  try {
    url = new URL(baseUrl);
  } catch {
    throw new ConfigurationError("QredexClient baseUrl must be a valid URL.");
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    throw new ConfigurationError(
      "QredexClient baseUrl must use http or https.",
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
