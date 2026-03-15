import { Qredex, QredexScope } from "../src";

const qredex = Qredex.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: [QredexScope.ORDERS_READ],
  },
});

const orderDetails = await qredex.orders.getDetails(
  process.env.QREDEX_ORDER_ATTRIBUTION_ID!,
);

console.log(orderDetails);
