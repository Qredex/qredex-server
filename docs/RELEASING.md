# Releasing `qredex`

## Release Checklist

1. Reconcile any platform contract drift before release.
2. Bump the package version:
   - `npm run release:version -- 1.1.0`
3. Update [`CHANGELOG.md`](../CHANGELOG.md).
4. Run local verification:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
5. Run the live integration suite against staging:
   - `QREDEX_LIVE_ENABLED=1`
   - `QREDEX_LIVE_ENVIRONMENT=staging`
   - `QREDEX_LIVE_CLIENT_ID=...`
   - `QREDEX_LIVE_CLIENT_SECRET=...`
   - `QREDEX_LIVE_STORE_ID=...`
   - `npm run test:live`
6. Inspect the publish tarball:
   - `npm pack --dry-run`
7. Commit and push the version change to `main`.
8. GitHub Actions will:
   - create tag `v<version>` from [`package.json`](../package.json)
   - publish `qredex` to npm when that tag is pushed
   - create the GitHub release after a successful npm publish

## Notes

- `production` is the default SDK environment.
- `staging` resolves to `https://staging-api.qredex.com`.
- `development` resolves to `http://localhost:8080`.
- `prepublishOnly` runs `typecheck`, `test`, and `build` before publish.
- `publish.yml` requires an `NPM_TOKEN` repository secret with publish access.
- `publish.yml` uses npm provenance during publish.

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
