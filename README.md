# unicep

Unified Brazilian postal code (CEP) lookup for browsers and Node.js, with automatic provider
fallback powered by circuit breakers.

> **Status:** early development. The public API is not stable yet.

## Why

Public CEP services (ViaCEP, BrasilAPI, IBGE, ...) go down from time to time. `unicep` queries
several providers behind a single interface, detects failing services with circuit breakers and
transparently falls back to the next one, always returning the same normalized `Address`.

## Packages

| Package                         | Description                                               |
| ------------------------------- | --------------------------------------------------------- |
| [`@unicep/core`](packages/core) | Framework-agnostic TypeScript core and built-in providers |

React, Vue, Angular and server bindings are planned.

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
