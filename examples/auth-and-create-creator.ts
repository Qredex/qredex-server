import { QredexClient } from "../src";

const client = QredexClient.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: ["direct:creators:write"],
  },
});

const token = await client.auth.issueToken();
console.log({
  expires_in: token.expires_in,
  scope: token.scope,
  token_type: token.token_type,
});

const creator = await client.creators.create({
  handle: "alice",
  display_name: "Alice Example",
});

console.log(creator);
