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

import type { DirectScope } from "./types";

export type CreatorStatus = "ACTIVE" | "DISABLED";
export type LinkStatus = "ACTIVE" | "DISABLED";
export type OrderSource = "SHOPIFY" | "DIRECT_API";
export type DuplicateConfidence = "LOW" | "MEDIUM" | "HIGH";
export type DuplicateReason =
  | "EXACT_EXTERNAL_ORDER_ID"
  | "CHECKOUT_TOKEN_MATCH"
  | "CUSTOMER_EMAIL_HASH_MATCH"
  | "AMOUNT_TIME_MATCH";
export type IntegrityReason =
  | "MISSING"
  | "TAMPERED"
  | "EXPIRED"
  | "MISMATCHED"
  | "REPLACED"
  | "LINK_INACTIVE"
  | "CREATOR_INACTIVE";
export type OriginMatchStatus = "MATCH" | "MISMATCH" | "ABSENT" | "UNKNOWN";
export type IntegrityBand = "HIGH" | "MEDIUM" | "LOW" | "CRITICAL";
export type ResolutionStatus = "ATTRIBUTED" | "UNATTRIBUTED" | "REJECTED";
export type WindowStatus = "WITHIN" | "OUTSIDE" | "UNKNOWN";
export type TokenIntegrity = "VALID" | "INVALID";
export type OrderIngestionDecision =
  | "INGESTED"
  | "IDEMPOTENT"
  | "REJECTED_SOURCE_POLICY"
  | "REJECTED_CROSS_SOURCE_DUPLICATE";

export interface ApiErrorResponse {
  error_code?: string;
  message?: string;
}

export interface TimedResponse {
  created_at: string;
  updated_at: string;
}

export interface CreateCreatorRequest {
  handle: string;
  display_name?: string | null;
  email?: string | null;
  socials?: Record<string, string>;
}

export interface GetCreatorRequest {
  creator_id: string;
}

export interface ListCreatorsRequest {
  page?: number;
  size?: number;
  status?: CreatorStatus;
}

export interface CreatorResponse {
  id: string;
  handle: string;
  status: CreatorStatus;
  display_name?: string | null;
  email?: string | null;
  socials?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface CreatorListResponse extends CreatorResponse {
  links_count?: number;
  orders_count?: number;
  revenue_total?: number;
}

export interface CreatorPageResponse {
  items: CreatorListResponse[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
}

export interface CreateLinkRequest {
  store_id: string;
  creator_id: string;
  link_name: string;
  destination_path: string;
  note?: string | null;
  attribution_window_days?: number | null;
  link_expiry_at?: string | null;
  discount_code?: string | null;
  status?: LinkStatus | null;
}

export interface GetLinkRequest {
  link_id: string;
}

export interface ListLinksRequest {
  page?: number;
  size?: number;
  status?: LinkStatus;
  destination?: string;
  expired?: boolean;
}

export interface LinkResponse {
  id: string;
  merchant_id: string;
  store_id: string;
  creator_id: string;
  link_name: string;
  link_code: string;
  public_link_url: string;
  destination_path: string;
  note?: string | null;
  status: LinkStatus;
  attribution_window_days: number;
  link_expiry_at?: string | null;
  disabled_at?: string | null;
  discount_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkListResponse {
  id: string;
  store_id: string;
  link_name: string;
  link_code: string;
  destination_path: string;
  note?: string | null;
  status: LinkStatus;
  attribution_window_days: number;
  link_expiry_at?: string | null;
  discount_code?: string | null;
  created_at: string;
  updated_at: string;
  creator_id: string;
  creator_handle: string;
  creator_display_name?: string | null;
  clicks_count?: number;
  orders_count?: number;
  revenue_total?: number;
}

export interface LinkPageResponse {
  items: LinkListResponse[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
}

export interface IssueInfluenceIntentTokenRequest {
  link_id: string;
  ip_hash?: string | null;
  user_agent_hash?: string | null;
  referrer?: string | null;
  landing_path?: string | null;
  expires_at?: string | null;
  integrity_version?: number | null;
}

export interface InfluenceIntentResponse {
  id: string;
  merchant_id: string;
  link_id: string;
  token: string;
  token_id: string;
  issued_at: string;
  expires_at: string;
  status: string;
  integrity_version: number;
  ip_hash?: string | null;
  user_agent_hash?: string | null;
  referrer?: string | null;
  landing_path?: string | null;
  timing?: TimedResponse;
}

export interface CreateAndLockPurchaseIntentRequest {
  token: string;
  source?: string | null;
  integrity_version?: number | null;
}

export interface PurchaseIntentResponse {
  id: string;
  merchant_id: string;
  store_id: string;
  link_id: string;
  influence_intent_id?: string;
  token: string;
  token_id: string;
  source?: string | null;
  origin_match_status?: OriginMatchStatus;
  window_status?: WindowStatus;
  attribution_window_days?: number;
  attribution_window_days_snapshot?: number;
  store_domain_snapshot: string;
  link_expiry_at_snapshot?: string | null;
  discount_code_snapshot?: string | null;
  issued_at: string;
  expires_at: string;
  locked_at?: string | null;
  integrity_version: number;
  eligible?: boolean;
  timing?: TimedResponse;
  created_at?: string;
  updated_at?: string;
}

export interface RecordPaidOrderRequest {
  store_id: string;
  external_order_id: string;
  order_number?: string | null;
  paid_at?: string | null;
  currency: string;
  subtotal_price?: number | null;
  discount_total?: number | null;
  total_price?: number | null;
  customer_email_hash?: string | null;
  checkout_token?: string | null;
  purchase_intent_token?: string | null;
}

export interface ListOrdersRequest {
  page?: number;
  size?: number;
}

export interface RecordRefundRequest {
  store_id: string;
  external_order_id: string;
  external_refund_id: string;
  refund_total?: number | null;
  refunded_at?: string | null;
}

export interface OrderAttributionResponse {
  id: string;
  merchant_id: string;
  order_source: OrderSource;
  external_order_id: string;
  order_number?: string | null;
  paid_at?: string | null;
  currency: string;
  subtotal_price?: number | null;
  discount_total?: number | null;
  total_price?: number | null;
  purchase_intent_token?: string | null;
  link_id?: string | null;
  link_name?: string | null;
  link_code?: string | null;
  creator_id?: string | null;
  creator_handle?: string | null;
  creator_display_name?: string | null;
  duplicate_suspect: boolean;
  duplicate_confidence?: DuplicateConfidence | null;
  duplicate_reason?: DuplicateReason | null;
  duplicate_of_order_attribution_id?: string | null;
  window_status?: WindowStatus | null;
  token_integrity?: TokenIntegrity | null;
  integrity_reason?: IntegrityReason | null;
  origin_match_status?: OriginMatchStatus | null;
  integrity_score: number;
  integrity_band: IntegrityBand;
  review_required: boolean;
  resolution_status: ResolutionStatus;
  created_at: string;
  updated_at: string;
}

export interface OrderAttributionPageResponse {
  items: OrderAttributionResponse[];
  page: number;
  size: number;
  total_elements: number;
  total_pages: number;
}

export interface OrderAttributionScoreBreakdownResponse {
  score_version?: number;
  base_score?: number;
  origin_adjustment?: number;
  duplicate_adjustment?: number;
  final_score?: number;
  token_integrity?: TokenIntegrity | null;
  integrity_reason?: IntegrityReason | null;
  window_status?: WindowStatus | null;
  resolution_status: ResolutionStatus;
  origin_match_status?: OriginMatchStatus | null;
  duplicate_confidence?: DuplicateConfidence | null;
  review_required?: boolean;
  review_reasons?: string[];
}

export interface OrderAttributionTimelineEventResponse {
  event_type?: string;
  occurred_at?: string;
}

export interface OrderAttributionDetailsResponse {
  id: string;
  order_source: OrderSource;
  external_order_id: string;
  order_number?: string | null;
  paid_at?: string | null;
  currency: string;
  subtotal_price?: number | null;
  discount_total?: number | null;
  total_price?: number | null;
  link_id?: string | null;
  link_name?: string | null;
  link_code?: string | null;
  creator_id?: string | null;
  creator_handle?: string | null;
  creator_display_name?: string | null;
  duplicate_suspect: boolean;
  duplicate_confidence?: DuplicateConfidence | null;
  duplicate_reason?: DuplicateReason | null;
  duplicate_of_order_attribution_id?: string | null;
  attribution_locked_at?: string | null;
  attribution_window_days?: number | null;
  window_status?: WindowStatus | null;
  token_integrity?: TokenIntegrity | null;
  integrity_reason?: IntegrityReason | null;
  origin_match_status?: OriginMatchStatus | null;
  integrity_score: number;
  integrity_band: IntegrityBand;
  review_required: boolean;
  score_breakdown_json?: OrderAttributionScoreBreakdownResponse | null;
  resolution_status: ResolutionStatus;
  timeline?: OrderAttributionTimelineEventResponse[];
  created_at: string;
  updated_at: string;
}

export interface ListScopesRequest {
  scope?: DirectScope[] | string;
}
