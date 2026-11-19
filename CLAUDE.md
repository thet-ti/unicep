# unicep

A unified Brazilian postal code (CEP) lookup library for npm. Pure TypeScript core with
automatic provider fallback via the adapter + circuit breaker pattern, plus thin
framework bindings for React, Vue, Angular and backend usage.

## Problem

Every project we build re-implements its own CEP lookup class. The public services we rely
on (ViaCEP, BrasilAPI, IBGE, ...) go down regularly. We recently adopted an
**adapter + circuit breaker** architecture that detects when a service is failing and
transparently switches to the next one. This project extracts that into a reusable,
open-source npm library.

## Goals

- One normalized `Address` result regardless of which provider answered.
- Automatic failover between providers using circuit breakers.
- Runs in **browsers and Node.js** (native `fetch`, no Node-only APIs in core).
- Framework-agnostic core; framework packages are thin wrappers only.
- Many built-in providers (ViaCEP, BrasilAPI, IBGE, and more over time).
- Easy to add custom providers (public `CepProvider` interface).
- Well-tested, typed, tree-shakeable, properly documented, ready for open source.

## Architecture

```
            +----------------------------+
 consumer → |  Unicep (pure TS core)     |
            |  - input validation (CEP)  |
            |  - provider ordering       |
            |  - circuit breaker policy  |
            |  - retry / timeout         |
            +-------------+--------------+
                          |
          +---------------+----------------+
          v               v                v
   ViaCepProvider  BrasilApiProvider  IbgeProvider ...
   (each maps its raw response → normalized Address)
```

- **Provider (adapter):** implements `CepProvider { name; lookup(cep, { signal }): Promise<Address> }`.
  Each provider owns its HTTP call and response mapping. Providers must throw typed errors
  (`CepNotFoundError` vs. transport/service errors) so the core knows whether a failure
  should count against the circuit breaker (service failure) or not (CEP simply doesn't exist).
- **Core (`Unicep`):** takes an ordered list of providers, wraps each in a circuit breaker,
  and tries them in order, skipping open circuits. Returns the first successful `Address`.
- **Framework bindings:** wrap the core, add no lookup logic.

## Package layout (pnpm workspaces + Turborepo)

| Package           | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `@unicep/core`    | Pure TS: `Unicep` class, `Address` type, providers, errors |
| `@unicep/react`   | `useCep` hook                                              |
| `@unicep/vue`     | `useCep` composable                                        |
| `@unicep/angular` | `injectCep` (signals), `lookupCep` (RxJS), `UNICEP` token  |

Apps live in `apps/*` and are private (never published, ignored by changesets):

| App              | Purpose                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `@unicep/status` | Astro SSR status page: online/offline, latency and circuit state cards |

The status app probes each provider through its own `Unicep` instance (so the circuit state is
the real one), shares one snapshot between visitors for 60 seconds, and deploys to Render
(`render.yaml`, Node adapter). It uses Astro 6 because Astro 7 needs Node >= 22.23.4; upgrade
both Node and Astro together.

There is no server package: `@unicep/core` is already usable on the backend. Bindings are thin,
independent wrappers over the core (no shared UI runtime such as Preact). Angular bindings avoid decorators so they build with tsup instead of ng-packagr.

## Tech decisions

- **Language:** TypeScript (strict).
- **Package manager / monorepo:** pnpm workspaces + Turborepo.
- **Build:** tsup (ESM + CJS + `.d.ts`).
- **Tests:** Vitest, with mocked `fetch`.
- **Resilience:** [cockatiel](https://github.com/connor4312/cockatiel) for circuit breaker,
  retry and timeout policies (browser-compatible).
- **Lint/format:** Biome. **Commits:** commitlint + conventional commits. (to be set up)
- **Git:** `main` branch, conventional commits.

## Normalized `Address` (draft)

```ts
interface Address {
  cep: string; // 8 digits, no mask
  street: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string; // UF, e.g. "SP"
  ibgeCode?: string;
  provider: string; // which provider answered
}
```

## Conventions

- Code, comments, docs and commit messages are in **English**.
- Core must not import from any framework package or Node-only module.
- Every provider needs unit tests with recorded/mocked responses.
- Providers must work from browsers: the service has to send CORS headers (including on 404
  "not found" answers) and the request must stay CORS-simple (only an `Accept` header, no
  preflight). The four built-in providers were verified from a real browser.
- Public API changes require a changeset and docs update.

## Roadmap

1. Repo bootstrap: pnpm, Turborepo, TS config, Biome, commitlint, husky, Vitest, CI.
2. `@unicep/core`: types, errors, CEP validation, circuit-breaker orchestration.
3. Providers: ViaCEP, BrasilAPI, OpenCEP and AwesomeAPI are done. IBGE has no CEP lookup
   endpoint (only localities), so it is not a provider. Candidates: Correios (needs auth), others.
4. Framework bindings: React, Vue, Angular (done).
5. Docs site, README, CONTRIBUTING, release automation (changesets), npm publish.
