import { Qredex, QredexScope } from "../src";

const qredex = Qredex.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: [QredexScope.INTENTS_WRITE],
  },
});

const iit = await qredex.intents.issueInfluenceIntentToken({
  link_id: process.env.QREDEX_LINK_ID!,
  landing_path: "/products/spring-launch",
  integrity_version: 2,
});

console.log(iit);
