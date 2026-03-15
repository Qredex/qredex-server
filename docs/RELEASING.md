# Releasing `@qredex/node`

## Release Checklist

1. Reconcile any platform contract drift before release.
2. Run local verification:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
3. Run the live integration suite against staging:
   - `QREDEX_LIVE_ENABLED=1`
   - `QREDEX_LIVE_ENVIRONMENT=staging`
   - `QREDEX_LIVE_CLIENT_ID=...`
   - `QREDEX_LIVE_CLIENT_SECRET=...`
   - `QREDEX_LIVE_STORE_ID=...`
   - `npm run test:live`
4. Inspect the publish tarball:
   - `npm pack --dry-run`
5. Update [`CHANGELOG.md`](../CHANGELOG.md).
6. Bump the package version in [`package.json`](../package.json).
7. Publish:
   - `npm publish`

## Notes

- `production` is the default SDK environment.
- `staging` resolves to `https://staging-api.qredex.com`.
- `development` resolves to `http://localhost:8080`.
- `baseUrl` should only be used as an internal/testing override with non-production environments.
- `prepublishOnly` runs `typecheck`, `test`, and `build` before publish.

## Live Test Expectation

The live suite exercises the canonical machine flow:

1. create creator
2. fetch creator
3. list creators
4. create link
5. fetch link
6. list links
7. issue IIT
8. lock PIT
9. record paid order
10. record refund
