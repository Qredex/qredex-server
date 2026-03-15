import { Qredex } from "../src";

const qredex = Qredex.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: ["direct:intents:write"],
  },
});

const pit = await qredex.intents.lockPurchaseIntent({
  token: process.env.QREDEX_IIT_TOKEN!,
  source: "backend-cart-lock",
  integrity_version: 2,
});

console.log(pit);
