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

import type {
  AccessTokenAuthOptions,
  ClientCredentialsAuthOptions,
  DirectScope,
  QredexAuthOptions,
  QredexRetryPolicy,
} from "../types";

export function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);

  return url.toString().replace(/\/+$/, "");
}

export function normalizeScope(scope?: DirectScope[] | string): string | undefined {
  if (scope === undefined) {
    return undefined;
  }

  if (typeof scope === "string") {
    const trimmed = scope.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  const normalized = scope.map((value) => value.trim()).filter(Boolean).join(" ");
  return normalized.length > 0 ? normalized : undefined;
}

export function scopesEqual(
  left?: DirectScope[] | string,
  right?: DirectScope[] | string,
): boolean {
  return normalizeScope(left) === normalizeScope(right);
}

export function appendQuery(
  url: URL,
  query?: object,
): void {
  if (!query) {
    return;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      url.searchParams.set(key, String(value));
    }
  }
}

export function isClientCredentialsAuth(
  auth: QredexAuthOptions,
): auth is ClientCredentialsAuthOptions {
  return auth.type !== "access_token";
}

export function isAccessTokenAuth(
  auth: QredexAuthOptions,
): auth is AccessTokenAuthOptions {
  return auth.type === "access_token";
}

export function clampRetryPolicy(
  retry?: QredexRetryPolicy,
): Required<QredexRetryPolicy> {
  return {
    maxAttempts: Math.max(1, retry?.maxAttempts ?? 2),
    baseDelayMs: Math.max(0, retry?.baseDelayMs ?? 250),
    maxDelayMs: Math.max(0, retry?.maxDelayMs ?? 1_000),
  };
}

export function isRetryableStatus(status?: number): boolean {
  return status === 429 || (status !== undefined && status >= 500 && status <= 599);
}

export function computeRetryDelayMs(
  attempt: number,
  retry: Required<QredexRetryPolicy>,
): number {
  const exponentialDelay = retry.baseDelayMs * 2 ** Math.max(0, attempt - 1);
  return Math.min(exponentialDelay, retry.maxDelayMs);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function maybeParseJson(text: string): unknown {
  const trimmed = text.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

export function resolveAccessToken(
  value: string | (() => string | Promise<string>),
): Promise<string> {
  return Promise.resolve(typeof value === "function" ? value() : value).then(
    (token) => token.replace(/^Bearer\s+/i, "").trim(),
  );
}

export function toBasicAuthHeader(username: string, password: string): string {
  const encoded = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
  return `Basic ${encoded}`;
}

export function toIsoDate(timestampMs: number): string {
  return new Date(timestampMs).toISOString();
}

export function pickFirstHeader(
  headers: Headers,
  candidates: string[],
): string | undefined {
  for (const candidate of candidates) {
    const value = headers.get(candidate);
    if (value) {
      return value;
    }
  }

  return undefined;
}
