import { describe, expect, it } from "vitest";

import { QredexClient } from "../src";

const liveEnabled = process.env.QREDEX_LIVE_ENABLED === "1";
const requiredEnv = [
  "QREDEX_LIVE_BASE_URL",
  "QREDEX_LIVE_CLIENT_ID",
  "QREDEX_LIVE_CLIENT_SECRET",
  "QREDEX_LIVE_STORE_ID",
] as const;
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

describe.skipIf(!liveEnabled || missingEnv.length > 0)(
  "Qredex live integration",
  () => {
    it("runs the canonical integrations flow against a live API", async () => {
      const client = QredexClient.init({
        baseUrl: process.env.QREDEX_LIVE_BASE_URL!,
        auth: {
          clientId: process.env.QREDEX_LIVE_CLIENT_ID!,
          clientSecret: process.env.QREDEX_LIVE_CLIENT_SECRET!,
        },
      });
      const suffix = Date.now().toString();

      const creator = await client.creators.create({
        handle: `codex-${suffix}`,
        display_name: `Codex ${suffix}`,
      });

      const fetchedCreator = await client.creators.get({
        creator_id: creator.id,
      });
      const listedCreators = await client.creators.list({
        status: "ACTIVE",
      });

      const link = await client.links.create({
        store_id: process.env.QREDEX_LIVE_STORE_ID!,
        creator_id: creator.id,
        link_name: `codex-link-${suffix}`,
        destination_path: `/products/codex-${suffix}`,
        attribution_window_days: 30,
        status: "ACTIVE",
      });

      const fetchedLink = await client.links.get({
        link_id: link.id,
      });
      const listedLinks = await client.links.list({
        status: "ACTIVE",
      });

      const iit = await client.intents.issueInfluenceIntentToken({
        link_id: link.id,
        landing_path: `/products/codex-${suffix}`,
      });

      const pit = await client.intents.lockPurchaseIntent({
        token: iit.token,
        source: "live-integration-test",
        integrity_version: 2,
      });

      const order = await client.orders.recordPaidOrder({
        store_id: process.env.QREDEX_LIVE_STORE_ID!,
        external_order_id: `codex-order-${suffix}`,
        currency: "USD",
        purchase_intent_token: pit.token,
      });

      const refund = await client.refunds.recordRefund({
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
      expect(refund.external_order_id).toBe(`codex-order-${suffix}`);
    }, 60_000);
  },
);
