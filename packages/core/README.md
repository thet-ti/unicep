# @unicep/core

Brazilian postal code (CEP) lookup for browsers and Node.js. It queries several public services
behind one interface, detects failing ones with circuit breakers and falls back to the next
one, always returning the same normalized `Address`.

- Framework-agnostic, written in TypeScript, ESM and CJS.
- Works in browsers and Node.js 20+ (uses the native `fetch`).
- Built-in providers: ViaCEP, BrasilAPI, OpenCEP and AwesomeAPI.
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
  timeoutMs: 3000, // per provider, default 5000
  circuitBreaker: {
    failureThreshold: 3, // consecutive failures before opening, default 3
    resetTimeoutMs: 30_000, // wait before a trial request, default 30000
  },
});

unicep.status();
// [{ name: 'viacep', circuit: 'closed' }, { name: 'brasilapi', circuit: 'open' }, ...]
```

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

| Function       | Service                                              |
| -------------- | ---------------------------------------------------- |
| `viaCep()`     | [ViaCEP](https://viacep.com.br)                      |
| `brasilApi()`  | [BrasilAPI](https://brasilapi.com.br) (CEP v2)       |
| `openCep()`    | [OpenCEP](https://opencep.com)                       |
| `awesomeApi()` | [AwesomeAPI](https://docs.awesomeapi.com.br/api-cep) |

`defaultProviders()` returns all of them in that order. Every provider accepts
`{ fetch?, baseUrl? }`, to plug in your own `fetch` or point to a proxy or self-hosted instance:

```ts
import { Unicep, viaCep, brasilApi } from '@unicep/core';

const unicep = new Unicep({
  providers: [viaCep({ baseUrl: 'https://my-proxy.example.com/viacep' }), brasilApi()],
});
```

All built-in services send CORS headers, so they work from the browser.

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
