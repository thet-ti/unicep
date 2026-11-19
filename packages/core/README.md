# @unicep/core

Brazilian postal code (CEP) lookup for browsers and Node.js. It queries several public services
behind one interface, detects failing ones with circuit breakers and falls back to the next
one, always returning the same normalized `Address`.

**Documentation:** [unicep.thet.dev](https://unicep.thet.dev) (Portuguese and English) · [provider status](https://unicep.thet.dev/status)

- Framework-agnostic, written in TypeScript, ESM and CJS.
- Works in browsers and Node.js 20+ (uses the native `fetch`).
- Built-in providers: ViaCEP, BrasilAPI and OpenCEP, plus AwesomeAPI (needs an API key).
- Add your own provider by implementing a small interface.

Framework bindings: [`@unicep/react`](https://github.com/thet-ti/unicep/tree/main/packages/react),
[`@unicep/vue`](https://github.com/thet-ti/unicep/tree/main/packages/vue) and
[`@unicep/angular`](https://github.com/thet-ti/unicep/tree/main/packages/angular).

## Install

```bash
npm install @unicep/core
```

## Usage

```ts
import { Unicep, defaultProviders } from '@unicep/core';

const unicep = new Unicep({ providers: defaultProviders() });

const address = await unicep.lookup('01310-100'); // hyphen is optional
// {
//   cep: '01310100',
//   street: 'Avenida Paulista',
//   complement: 'de 612 a 1510 - lado par',
//   neighborhood: 'Bela Vista',
//   city: 'São Paulo',
//   state: 'SP',
//   ibgeCode: '3550308',
//   provider: 'viacep'
// }
```

`complement` and `ibgeCode` are optional because not every provider returns them. `street` and
`neighborhood` are empty strings for city-level CEPs.

## How fallback works

Providers are tried in the order you give. Each one has its own circuit breaker:

- A provider failure (network error, timeout, HTTP 4xx/5xx other than "not found", malformed
  response) counts against its breaker. After `failureThreshold` consecutive failures the
  circuit opens and the provider is skipped until `resetTimeoutMs` has passed; then one trial
  request decides whether it closes again.
- "CEP not found" never counts as a failure. The lookup moves on to the next provider, because
  services have different coverage. If every provider that answered said "not found", you get a
  `CepNotFoundError`; otherwise an `AllProvidersFailedError`.
- Cancelling with an `AbortSignal` never counts as a failure.

```ts
const unicep = new Unicep({
  providers: defaultProviders(),
  timeoutMs: 3000, // per provider and attempt, default 5000
  circuitBreaker: {
    failureThreshold: 3, // consecutive failures before opening, default 3
    resetTimeoutMs: 30_000, // wait before a trial request, default 30000
  },
});

unicep.status();
// [{ name: 'viacep', circuit: 'closed' }, { name: 'brasilapi', circuit: 'open' }, ...]
```

## Retry

By default a failing provider is skipped right away and the next one is tried. To also retry the
same provider first (useful for flaky networks or when you have a single provider), enable
`retry`:

```ts
const unicep = new Unicep({
  providers: defaultProviders(),
  retry: {
    attempts: 2, // extra attempts per provider, default 0 (disabled)
    delayMs: 200, // before the first retry, doubled on each further retry, default 200
  },
});
```

Only provider failures are retried; "not found" and cancellations are final. A provider that
fails all its attempts counts as a single failure for its circuit breaker.

## Cache

Opt in to an in-memory cache to avoid repeated requests for the same CEP:

```ts
const unicep = new Unicep({
  providers: defaultProviders(),
  cache: {
    ttlMs: 5 * 60_000, // how long an address is reused, default 5 minutes
    maxEntries: 500, // least recently used entries are evicted first, default 500
  },
});

unicep.clearCache();
```

Only successful lookups are cached (not "not found" or failures). Masked and unmasked CEPs share
an entry, and each call gets its own copy of the address. The cache lives in the `Unicep`
instance, so create it once and reuse it.

## Errors

All errors extend `UnicepError`.

| Error                     | When                                                                 |
| ------------------------- | -------------------------------------------------------------------- |
| `InvalidCepError`         | The input is not a valid CEP. No request is made.                    |
| `CepNotFoundError`        | The CEP is well formed but no provider knows it.                     |
| `AllProvidersFailedError` | No provider could answer. `error.errors` has one entry per provider. |
| `ProviderError`           | Thrown by a provider on failure (`error.provider`, `error.cause`).   |
| `CircuitOpenError`        | A provider was skipped because its circuit is open.                  |

```ts
import { AllProvidersFailedError, CepNotFoundError, InvalidCepError } from '@unicep/core';

try {
  await unicep.lookup(input);
} catch (error) {
  if (error instanceof InvalidCepError) {
    /* show a validation message */
  } else if (error instanceof CepNotFoundError) {
    /* CEP does not exist */
  } else if (error instanceof AllProvidersFailedError) {
    /* every service is down; inspect error.errors */
  }
}
```

## Providers

| Function       | Service                                              | API key      |
| -------------- | ---------------------------------------------------- | ------------ |
| `viaCep()`     | [ViaCEP](https://viacep.com.br)                      | no           |
| `brasilApi()`  | [BrasilAPI](https://brasilapi.com.br) (CEP v2)       | no           |
| `openCep()`    | [OpenCEP](https://opencep.com)                       | no           |
| `awesomeApi()` | [AwesomeAPI](https://docs.awesomeapi.com.br/api-cep) | **required** |

`defaultProviders()` returns ViaCEP, BrasilAPI and OpenCEP, in that order. AwesomeAPI is left out
because it needs an API key (see below). Every provider accepts
`{ fetch?, baseUrl? }`, to plug in your own `fetch` or point to a proxy or self-hosted instance:

```ts
import { Unicep, viaCep, brasilApi } from '@unicep/core';

const unicep = new Unicep({
  providers: [viaCep({ baseUrl: 'https://my-proxy.example.com/viacep' }), brasilApi()],
});
```

All built-in services send CORS headers, so they work from the browser.

AwesomeAPI needs an API key: without one it may rate limit or reject requests, especially from
cloud servers. The key is sent as the `token` query parameter (no CORS preflight). Use it only on
the server or behind a proxy, never in browser code:

```ts
awesomeApi({ apiKey: process.env.AWESOMEAPI_KEY });

// defaultProviders() adds AwesomeAPI at the end only when you pass its key
defaultProviders({ apiKeys: { awesomeapi: process.env.AWESOMEAPI_KEY } });
```

### Disclaimer and responsible use

`@unicep/core` does not provide, host or own any CEP data or API: it only queries the services
above, which are independent and have their own terms, limits and availability. This project is
not affiliated with, endorsed by or sponsored by any of them, and their names belong to their
respective owners. The software is provided "as is" under the MIT license, with no warranty.

Please use these free services responsibly: enable the [cache](#cache), do not crawl or validate
entire databases (some services warn that heavy automated use may get you blocked; for bulk
needs use a downloadable database or host your own), and read each service's terms. For
commercial or business-critical use, consider contacting the maintainers or running your own
instance through the `baseUrl` option.

### Custom provider

```ts
import { CepNotFoundError, ProviderError, type CepProvider } from '@unicep/core';

const myProvider: CepProvider = {
  name: 'my-api',
  async lookup(cep, { signal }) {
    const response = await fetch(`https://my-api.example.com/cep/${cep}`, { signal });
    if (response.status === 404) throw new CepNotFoundError(cep);
    if (!response.ok) throw new ProviderError('my-api', `HTTP ${response.status}`);
    const data = await response.json();
    return {
      cep,
      street: data.street,
      neighborhood: data.district,
      city: data.city,
      state: data.uf,
    };
  },
};
```

Resolve with the address (without `provider`, which is filled in for you), throw
`CepNotFoundError` when the CEP does not exist and anything else for service failures. Pass
`signal` to `fetch` so timeouts and cancellations work. Provider names must be unique.

## Helpers

```ts
import { formatCep, getDefaultUnicep, isValidCep, normalizeCep } from '@unicep/core';

isValidCep('01310-100'); // true
normalizeCep('01310-100'); // '01310100'
formatCep('01310100'); // '01310-100'
getDefaultUnicep(); // shared instance with all built-in providers
```

## Cancellation

```ts
const controller = new AbortController();
const promise = unicep.lookup('01310100', { signal: controller.signal });
controller.abort(); // rejects with the abort reason
```

## License

[MIT](https://github.com/thet-ti/unicep/blob/main/LICENSE)
