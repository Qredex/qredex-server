import { Qredex, QredexScope } from "../src";

const qredex = Qredex.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: [QredexScope.ORDERS_READ],
  },
});

const orders = await qredex.orders.list({
  page: 0,
  size: 20,
});

console.log(orders);
