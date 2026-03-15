import { QredexClient } from "../src";

const client = QredexClient.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: ["direct:orders:write"],
  },
});

const refund = await client.refunds.recordRefund({
  store_id: process.env.QREDEX_STORE_ID!,
  external_order_id: "order-100045",
  external_refund_id: "refund-100045-1",
  refund_total: 25,
});

console.log(refund);
