# Changelog

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
