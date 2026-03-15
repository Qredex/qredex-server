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

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface MockServerRequest {
  bodyText: string;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  path: string;
  query: URLSearchParams;
}

export interface MockServerReply {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

export type MockServerHandler = (
  request: MockServerRequest,
  attempt: number,
) => MockServerReply | Promise<MockServerReply>;

interface RouteDefinition {
  method: string;
  path: string;
  handler: MockServerHandler;
}

function routeKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

export async function startMockQredexServer(routes: RouteDefinition[]) {
  const attempts = new Map<string, number>();

  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const key = routeKey(method, url.pathname);
    const route = routes.find((candidate) => routeKey(candidate.method, candidate.path) === key);

    if (!route) {
      response.writeHead(404, {
        "content-type": "application/json",
      });
      response.end(JSON.stringify({
        error_code: "mock_route_not_found",
        message: `No mock route for ${key}`,
      }));
      return;
    }

    const attempt = (attempts.get(key) ?? 0) + 1;
    attempts.set(key, attempt);

    const reply = await route.handler({
      bodyText: await readBody(request),
      headers: request.headers,
      method,
      path: url.pathname,
      query: url.searchParams,
    }, attempt);

    const headers = {
      "content-type": "application/json",
      ...(reply.headers ?? {}),
    };

    response.writeHead(reply.status, headers);

    if (reply.body === undefined) {
      response.end();
      return;
    }

    if (typeof reply.body === "string") {
      response.end(reply.body);
      return;
    }

    response.end(JSON.stringify(reply.body));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Mock server did not bind to a TCP address.");
  }

  return {
    baseUrl: `http://127.0.0.1:${(address as AddressInfo).port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

export function createDevelopmentProxyFetch(baseUrl: string): typeof fetch {
  const upstreamOrigin = new URL(baseUrl).origin;

  return async (input: Request | URL | string, init?: RequestInit) => {
    const original = typeof input === "string" || input instanceof URL
      ? new URL(String(input))
      : new URL(input.url);

    const redirected = new URL(original.pathname + original.search, upstreamOrigin);

    if (input instanceof Request) {
      return fetch(new Request(redirected, input), init);
    }

    return fetch(redirected, init);
  };
}
