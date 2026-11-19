---
"@unicep/core": minor
---

Add `states()` and `cities(uf)`: list Brazilian states and cities with the same provider fallback and circuit breakers, cached for 24 hours. Built-in locality providers: `brasilApiLocalities()` and `ibge()`. Also adds `localitiesStatus()`, `ufs`, `isValidUf()`, `normalizeUf()`, `InvalidStateError` and `AllLocalityProvidersFailedError`.
