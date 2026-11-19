---
"@unicep/core": minor
---

AwesomeAPI now needs an API key: it is no longer part of `defaultProviders()`. Pass `awesomeApi({ apiKey })`, or `defaultProviders({ apiKeys: { awesomeapi } })` to append it. The key is sent as the `token` query parameter.
