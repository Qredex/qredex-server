# Changelog

## 0.1.1

Incremental SDK hardening and release automation update for `qredex`.

Includes:

- order read support through `qredex.orders.list()` and `qredex.orders.getDetails()`
- typed order attribution page and details responses
- exported `QredexScope`, `QredexEnvironment`, `QredexHeader`, and `QredexErrorCode` helpers
- typed error guard helpers for narrower error handling
- bootstrap support for optional `QREDEX_SCOPE`
- improved public docs, examples, and live environment template
- production-grade GitHub Actions release flow with version-tag creation, npm Trusted Publishing, and GitHub Release creation
- manual recovery path for existing release tags
- release verification and publish helper scripts
- local and live test coverage updates for order reads and release-safe behavior

## 0.1.0

Initial production-ready release of `qredex`.

Includes:

- automatic auth token issuance for `/api/v1/auth/token`
- environment-based bootstrap through `Qredex.bootstrap()`
- creators create, get, and list
- links create, get, and list
- IIT issuance
- PIT lock
- paid order recording
- refund recording
- typed errors with preserved Qredex metadata
- environment presets for production, staging, and development
- sanitized SDK events and opt-in read retries
- unit tests, local mock-server integration coverage, and opt-in live integration coverage
