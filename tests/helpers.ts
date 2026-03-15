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

import { vi } from "vitest";

import type { FetchLike } from "../src/types";

export interface FetchCall {
  input: Request | URL | string;
  init?: RequestInit;
}

export type FetchQueueItem =
  | Error
  | Response
  | ((input: Request | URL | string, init?: RequestInit) => Response | Promise<Response>);

export function createFetchMock(queue: FetchQueueItem[]) {
  const calls: FetchCall[] = [];

  const fetch = vi.fn<FetchLike>(async (input, init) => {
    calls.push({ input, init });
    const next = queue.shift();

    if (!next) {
      throw new Error("Unexpected fetch call");
    }

    if (next instanceof Error) {
      throw next;
    }

    if (typeof next === "function") {
      return next(input, init);
    }

    return next;
  });

  return { calls, fetch };
}

export function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

export function textResponse(
  status: number,
  body: string,
  headers: Record<string, string> = {},
): Response {
  return new Response(body, {
    status,
    headers,
  });
}

export function getHeader(call: FetchCall, name: string): string | null {
  return new Headers(call.init?.headers).get(name);
}

export function getBodyText(call: FetchCall): string {
  return String(call.init?.body ?? "");
}

export function getJsonBody<T>(call: FetchCall): T {
  return JSON.parse(getBodyText(call)) as T;
}
