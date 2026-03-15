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

export const QredexScope = Object.freeze({
  API: "direct:api",
  MERCHANT_READ: "direct:merchant:read",
  MERCHANT_WRITE: "direct:merchant:write",
  LINKS_READ: "direct:links:read",
  LINKS_WRITE: "direct:links:write",
  CREATORS_READ: "direct:creators:read",
  CREATORS_WRITE: "direct:creators:write",
  ORDERS_READ: "direct:orders:read",
  ORDERS_WRITE: "direct:orders:write",
  INTENTS_READ: "direct:intents:read",
  INTENTS_WRITE: "direct:intents:write",
} as const);
