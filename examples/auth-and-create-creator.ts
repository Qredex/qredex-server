import { Qredex } from "../src";

const qredex = Qredex.init({
  auth: {
    clientId: process.env.QREDEX_CLIENT_ID!,
    clientSecret: process.env.QREDEX_CLIENT_SECRET!,
    scope: ["direct:creators:write"],
  },
});

const token = await qredex.auth.issueToken();
console.log({
  expires_in: token.expires_in,
  scope: token.scope,
  token_type: token.token_type,
});

const creator = await qredex.creators.create({
  handle: "alice",
  display_name: "Alice Example",
});

console.log(creator);
