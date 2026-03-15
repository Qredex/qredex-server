# Support Policy

## Runtime Support

`qredex` supports:

- Node.js `18.x`
- Node.js `20.x`
- Node.js `22.x`

The package currently declares [`"node": ">=18"`](../package.json), and Node `18+` is the supported runtime floor.

## Environment Support

The SDK supports these built-in environments:

- `production` -> `https://api.qredex.com`
- `staging` -> `https://staging-api.qredex.com`
- `development` -> `http://localhost:8080`

`production` is the default.

## Versioning And SemVer

`qredex` follows semantic versioning.

- patch releases: bug fixes, docs fixes, internal hardening without public API breaks
- minor releases: backward-compatible public API additions
- major releases: breaking public API or behavior changes

Public API stability applies to:

- `Qredex`
- exported request and response types
- exported error classes
- documented config fields
- documented event types

Internal implementation details are not part of the compatibility contract.

## Deprecation Policy

When a public SDK surface needs to change:

1. mark the surface as deprecated in docs and types where possible
2. preserve the old behavior through at least one minor release when feasible
3. remove deprecated behavior only in a major release unless there is a security or correctness reason to act faster

If a platform-level contract change requires urgent action, release notes should call it out explicitly with the operational reason.

## Support Boundaries

The SDK supports only the Qredex Integrations API machine-to-machine surface.

Supported:

- auth token issuance
- creators
- links
- intents
- paid orders
- refunds

Out of scope:

- `/api/v1/merchant/**`
- `/api/v1/internal/**`
- browser/runtime agent logic
- Shopify OAuth/session exchange

## Testing Expectations

Before release:

- unit tests should pass
- build should pass
- staging live integration tests should pass when staging credentials are available

Live integration execution depends on external Qredex environment credentials and is intentionally opt-in.
