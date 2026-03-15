import { QredexClient } from "../src";

const client = QredexClient.init({
  baseUrl: process.env.QREDEX_BASE_URL!,
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: ["direct:links:write"],
  },
});

const link = await client.links.create({
  store_id: process.env.QREDEX_STORE_ID!,
  creator_id: process.env.QREDEX_CREATOR_ID!,
  link_name: "spring-launch",
  destination_path: "/products/spring-launch",
  attribution_window_days: 30,
  status: "ACTIVE",
});

console.log(link);
