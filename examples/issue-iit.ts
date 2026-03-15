import { QredexClient } from "../src";

const client = QredexClient.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: ["direct:intents:write"],
  },
});

const iit = await client.intents.issueInfluenceIntentToken({
  link_id: process.env.QREDEX_LINK_ID!,
  landing_path: "/products/spring-launch",
  integrity_version: 2,
});

console.log(iit);
