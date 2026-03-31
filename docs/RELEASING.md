# Releasing `@qredex/server`

This repo is a single-package Node SDK. The release source of truth is:

- [`package.json`](../package.json)
- [`package-lock.json`](../package-lock.json)

The automated release flow tags and publishes only when those version files are aligned.

## Local Release Commands

1. Bump the package version:
   - `ota run release:version --version 1.1.0`
2. Update [`CHANGELOG.md`](../CHANGELOG.md).
3. Run local verification:
   - `npm run test`
   - `npm run build`
   - `npm run release:check`
   - `npm run smoke:package`
4. Run the live integration suite against staging when credentials are available:
   - start from [`.env.live.example`](../.env.live.example)
   - `QREDEX_LIVE_ENABLED=1`
   - `QREDEX_LIVE_ENVIRONMENT=staging`
   - `QREDEX_LIVE_CLIENT_ID=...`
   - `QREDEX_LIVE_CLIENT_SECRET=...`
   - `QREDEX_LIVE_STORE_ID=...`
   - `npm run test:live`
5. Inspect the publish tarball:
   - `npm pack --dry-run`
6. Commit and merge the version bump to `main`.

## Automated GitHub Flow

The steady-state release model is GitHub-driven Trusted Publishing for `@qredex/server`.

When a version bump lands on `main`:

1. [`tag-release-on-version-change.yml`](../.github/workflows/tag-release-on-version-change.yml)
   - verifies `package.json` and `package-lock.json` versions match
   - reads the package version
   - creates `vX.Y.Z` if it does not already exist
2. [`publish-npm.yml`](../.github/workflows/publish-npm.yml)
   - runs from the tag workflow completion
   - also supports direct pushed tags as a recovery path
   - also supports manual `workflow_dispatch`
   - verifies the checked-out commit is the tagged release commit
   - runs `npm run release:check`
   - publishes with npm Trusted Publishing
   - creates the GitHub Release with generated notes through the GitHub CLI

The publish workflow is rerunnable. If the version is already published on npm, it skips the npm publish step safely instead of failing the run.

## Trusted Publishing Setup

`@qredex/server` uses npm Trusted Publishing. Do not configure `NPM_TOKEN` for this release flow.

Configure npm once for the package:

1. Open the npm package settings for `@qredex/server`.
2. Add a Trusted Publisher for this GitHub repository:
   - repository: `Qredex/qredex-server`
   - workflow file: `.github/workflows/publish-npm.yml`
   - branch: `main`
3. Ensure GitHub Actions is enabled for the repository.

The publish workflow already has:

- `id-token: write`
- Node `22.14.0`
- npm `11.5.1`

## Manual Recovery Flow

If the tag exists but the publish workflow needs to be rerun:

1. Open the `Publish package to npm` workflow in GitHub Actions.
2. Run it manually with `release_ref` set to:
   - the release tag, for example `v1.1.0`, or
   - the tagged release commit SHA

The workflow will:

- fetch tags
- verify that the checked-out commit matches the release tag for the current package version
- skip cleanly if the commit is not the tagged release commit
- skip cleanly if `@qredex/server@<version>` is already published

## Notes

- `npm run release:check` is the pre-publish verification path used by automation and includes the package smoke check.
- `npm test` and `npm run release:check` intentionally exclude the live integration suite.
- `npm run publish:npm` is only for the GitHub Actions release workflow.
- `prepublishOnly` still runs `npm run release:check` as a local safety net.
