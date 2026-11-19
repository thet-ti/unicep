# @unicep/core

## 0.2.0

### Minor Changes

- 2b5530c: AwesomeAPI now needs an API key: it is no longer part of `defaultProviders()`. Pass `awesomeApi({ apiKey })`, or `defaultProviders({ apiKeys: { awesomeapi } })` to append it. The key is sent as the `token` query parameter.

## 0.1.1

### Patch Changes

- 668db2e: Link the documentation site (unicep.thet.dev) from the package pages.

## 0.1.0

### Minor Changes

- 8e01960: Initial release: `Unicep` lookup with circuit breaker fallback and ViaCEP, BrasilAPI, OpenCEP and AwesomeAPI providers.
- 1bff689: Add opt-in `retry` (with exponential backoff) and in-memory `cache` options, plus `clearCache()`.
