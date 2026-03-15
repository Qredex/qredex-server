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

import { describe, expect, it } from "vitest";

import { Qredex } from "../src";

const liveEnabled = process.env.QREDEX_LIVE_ENABLED === "1";
const requiredEnv = [
  "QREDEX_LIVE_CLIENT_ID",
  "QREDEX_LIVE_CLIENT_SECRET",
  "QREDEX_LIVE_STORE_ID",
] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

describe.skipIf(!liveEnabled || missingEnv.length > 0)(
  "Qredex live integration",
  () => {
    it("runs the canonical integrations flow against a live API", async () => {
      const qredex = Qredex.init({
        environment:
          process.env.QREDEX_LIVE_ENVIRONMENT === "staging"
            ? "staging"
            : process.env.QREDEX_LIVE_ENVIRONMENT === "development"
              ? "development"
              : "production",
        auth: {
          clientId: process.env.QREDEX_LIVE_CLIENT_ID!,
          clientSecret: process.env.QREDEX_LIVE_CLIENT_SECRET!,
        },
      });
      const suffix = Date.now().toString();

      const creator = await qredex.creators.create({
        handle: `codex-${suffix}`,
        display_name: `Codex ${suffix}`,
      });

      const fetchedCreator = await qredex.creators.get({
        creator_id: creator.id,
      });
      const listedCreators = await qredex.creators.list({
        status: "ACTIVE",
      });

      const link = await qredex.links.create({
        store_id: process.env.QREDEX_LIVE_STORE_ID!,
        creator_id: creator.id,
        link_name: `codex-link-${suffix}`,
        destination_path: `/products/codex-${suffix}`,
        attribution_window_days: 30,
        status: "ACTIVE",
      });

      const fetchedLink = await qredex.links.get({
        link_id: link.id,
      });
      const listedLinks = await qredex.links.list({
        status: "ACTIVE",
      });

      const iit = await qredex.intents.issueInfluenceIntentToken({
        link_id: link.id,
        landing_path: `/products/codex-${suffix}`,
      });

      const pit = await qredex.intents.lockPurchaseIntent({
        token: iit.token,
        source: "live-integration-test",
        integrity_version: 2,
      });

      const order = await qredex.orders.recordPaidOrder({
        store_id: process.env.QREDEX_LIVE_STORE_ID!,
        external_order_id: `codex-order-${suffix}`,
        currency: "USD",
        purchase_intent_token: pit.token,
        subtotal_price: 100,
        total_price: 100,
      });

      const listedOrders = await qredex.orders.list({
        page: 0,
        size: 20,
      });
      const orderDetails = await qredex.orders.getDetails(order.id);

      const refund = await qredex.refunds.recordRefund({
        store_id: process.env.QREDEX_LIVE_STORE_ID!,
        external_order_id: `codex-order-${suffix}`,
        external_refund_id: `codex-refund-${suffix}`,
        refund_total: 1,
      });

      expect(fetchedCreator.id).toBe(creator.id);
      expect(listedCreators.items.some((item) => item.id === creator.id)).toBe(true);
      expect(fetchedLink.id).toBe(link.id);
      expect(listedLinks.items.some((item) => item.id === link.id)).toBe(true);
      expect(iit.token.length).toBeGreaterThan(0);
      expect(pit.token.length).toBeGreaterThan(0);
      expect(order.external_order_id).toBe(`codex-order-${suffix}`);
      expect(listedOrders.items.some((item) => item.id === order.id)).toBe(true);
      expect(orderDetails.id).toBe(order.id);
      expect(orderDetails.external_order_id).toBe(`codex-order-${suffix}`);
      expect(refund.external_order_id).toBe(`codex-order-${suffix}`);
    }, 60_000);
  },
);
