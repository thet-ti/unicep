# @unicep/core

## 0.3.0

### Minor Changes

- 3fd6ba4: Add optional `latitude` and `longitude` to `Address`. BrasilAPI and AwesomeAPI fill them in; they are always set together and left out when the value is missing or out of range.
- 1a54599: Add `circuitBreaker.lastResort`: when a lookup fails, still try the providers skipped because their circuit is open (in priority order); a success closes that circuit.
- 21610cc: Add `states()` and `cities(uf)`: list Brazilian states and cities with the same provider fallback and circuit breakers, cached for 24 hours. Built-in locality providers: `brasilApiLocalities()` and `ibge()`. Also adds `localitiesStatus()`, `ufs`, `isValidUf()`, `normalizeUf()`, `InvalidStateError` and `AllLocalityProvidersFailedError`.
- 07ebb24: Add an `order` option to `defaultProviders()` to choose which built-in providers come first (array or comma separated string); the rest follow as fallback.

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
