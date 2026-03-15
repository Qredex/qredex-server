import { Qredex, QredexScope } from "../src";

const qredex = Qredex.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: [QredexScope.ORDERS_WRITE],
  },
});

const order = await qredex.orders.recordPaidOrder({
  store_id: process.env.QREDEX_STORE_ID!,
  external_order_id: "order-100045",
  order_number: "100045",
  currency: "USD",
  total_price: 110,
  purchase_intent_token: process.env.QREDEX_PIT_TOKEN ?? null,
});

console.log(order);
