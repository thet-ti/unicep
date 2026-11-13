# Contributing

Thanks for your interest in unicep! Contributions of all kinds are welcome.

## Setup

```bash
pnpm install
```

Husky installs the git hooks automatically.

## Workflow

1. Fork the repo and create a branch from `main`.
2. Make your change, with tests.
3. Run the checks locally:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build && pnpm check:package
   ```

4. If your change affects a published package, add a changeset: `pnpm changeset`.
5. Open a pull request.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org), enforced by commitlint.
Examples: `feat(core): add viacep provider`, `fix(core): handle empty ibge response`.

## Code style

Formatting and linting are handled by [Biome](https://biomejs.dev). Run `pnpm lint:fix` to fix
issues automatically.

## Adding a provider

- Implement the `CepProvider` interface and map the raw response to the normalized `Address`.
- Throw a not-found error when the CEP doesn't exist, and a service error for transport/server
  failures, so the circuit breaker only reacts to real outages.
- Add unit tests with mocked `fetch` responses. Never hit real APIs in tests.

## Code of conduct

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).
