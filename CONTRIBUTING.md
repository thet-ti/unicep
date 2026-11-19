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

## Releasing (maintainers)

Two GitHub Actions workflows ship the project. Both run on pushes to `main`.

**npm packages** (`.github/workflows/release.yml`)

1. Every pull request that changes a published package includes a changeset.
2. After a push to `main`, the workflow verifies the repo (lint, typecheck, build, tests,
   package checks) and opens or updates a "chore: version packages" pull request.
3. Merging that pull request publishes the new versions of `@unicep/*` to npm with provenance
   and creates the GitHub releases.

**Status page** (`.github/workflows/deploy-status.yml`)

After a push to `main` that touches the status app, the core package or the deploy config
(or when run manually), the workflow builds and tests the app and then calls the Render deploy
hook for that exact commit. Render's own auto-deploy is off (see `render.yaml`).

Required setup:

| Where                  | Name                     | What                                                                            |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| Repository secret      | `NPM_TOKEN`              | npm automation token that can publish the `@unicep/*` packages                  |
| Repository secret      | `RENDER_DEPLOY_HOOK_URL` | Deploy hook of the Render service (Settings > Deploy Hook)                      |
| Repository environment | `production`             | Used by the deploy job; add required reviewers here if you want manual approval |

The first publish of each package must come from a token. Once the packages exist you can
switch to npm trusted publishing (GitHub OIDC) and drop `NPM_TOKEN`.

## Code of conduct

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).
