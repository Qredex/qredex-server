# Contributing

Thanks for helping improve `@qredex/server`.

## Development Setup

1. Install dependencies:
   - `npm ci`
2. Run the standard verification path:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`

## Change Guidelines

- Keep the public API small, typed, and deterministic.
- Preserve canonical Qredex naming and contract fidelity.
- Do not broaden scope into Merchant or Internal APIs.
- Prefer narrow changes over broad refactors.
- Add or update tests for behavioral changes.
- Update docs and examples when the public SDK surface changes.

## Release Notes

User-facing SDK changes should be reflected in [`CHANGELOG.md`](./CHANGELOG.md).

## Security

For security issues, do not open a public issue. Follow [`SECURITY.md`](./SECURITY.md).

## Conduct

Participation in this project is also governed by [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
