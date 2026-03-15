export const QredexScope = Object.freeze({
  API: "direct:api",
  MERCHANT_READ: "direct:merchant:read",
  MERCHANT_WRITE: "direct:merchant:write",
  LINKS_READ: "direct:links:read",
  LINKS_WRITE: "direct:links:write",
  CREATORS_READ: "direct:creators:read",
  CREATORS_WRITE: "direct:creators:write",
  ORDERS_READ: "direct:orders:read",
  ORDERS_WRITE: "direct:orders:write",
  INTENTS_READ: "direct:intents:read",
  INTENTS_WRITE: "direct:intents:write",
} as const);
