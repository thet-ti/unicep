# unicep

Unified Brazilian postal code (CEP) lookup for browsers and Node.js, with automatic provider
fallback powered by circuit breakers.

> **Status:** early development. The public API is not stable yet.

## Why

Public CEP services (ViaCEP, BrasilAPI, OpenCEP, ...) go down from time to time. `unicep` queries
several providers behind a single interface, detects failing services with circuit breakers and
transparently falls back to the next one, always returning the same normalized `Address`.

## Packages

| Package                               | Description                                               |
| ------------------------------------- | --------------------------------------------------------- |
| [`@unicep/core`](packages/core)       | Framework-agnostic TypeScript core and built-in providers |
| [`@unicep/react`](packages/react)     | `useCep` hook (React 18+)                                 |
| [`@unicep/vue`](packages/vue)         | `useCep` composable (Vue 3)                               |
| [`@unicep/angular`](packages/angular) | `injectCep` signals, `lookupCep` observable               |

## Usage

```ts
import { Unicep, defaultProviders } from '@unicep/core';

const unicep = new Unicep({ providers: defaultProviders() });
const address = await unicep.lookup('01310-100');
// { cep: '01310100', street: 'Avenida Paulista', city: 'São Paulo', state: 'SP', provider: 'viacep', ... }
```

Framework bindings look up automatically once the value is a valid CEP:

```tsx
// React
const { data, error, isLoading } = useCep(value);
```

```ts
// Vue
const { data, error, isLoading } = useCep(value); // value: ref or getter
```

```ts
// Angular (in an injection context)
readonly cep = injectCep(() => this.value());
```

All bindings use a shared default instance with the built-in providers. Pass `unicep` (or use
`provideUnicep` in Angular) to customize providers, timeout or circuit breaker.

## Providers and responsible use

unicep does not provide, host or own any CEP data or API. It is a client that queries these
independent public services, each with its own terms, limits and availability:

- [ViaCEP](https://viacep.com.br)
- [BrasilAPI](https://brasilapi.com.br)
- [OpenCEP](https://opencep.com)
- [AwesomeAPI](https://docs.awesomeapi.com.br/api-cep)

unicep is an independent open-source project and is not affiliated with, endorsed by or
sponsored by any of them. Their names belong to their respective owners. The software is
provided "as is" under the MIT license, with no warranty, and the availability and accuracy of
the data are the responsibility of each service (which is exactly why unicep falls back between
them).

Please use these free services responsibly:

- Enable the [in-memory cache](packages/core#cache) so the same CEP is not requested repeatedly.
- Do not use unicep to crawl or validate entire databases; some services warn that heavy
  automated use may get you blocked. For bulk needs, use a downloadable database (OpenCEP
  publishes one) or host your own.
- Read and respect each service's terms. For commercial or business-critical use, consider
  contacting the maintainers or running your own instance (see the `baseUrl` option).

## Status page

[`apps/site`](apps/site) is an Astro (SSR) page that shows, for each built-in provider,
whether it is online, its latency and the state of its circuit breaker. Checks are shared between
visitors and refreshed at most once a minute.

```bash
pnpm --filter @unicep/site dev
```

A [Render](https://render.com) blueprint is included in [`render.yaml`](render.yaml).

## Development

Requirements: Node.js >= 20 and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow.

## License

[MIT](LICENSE)
