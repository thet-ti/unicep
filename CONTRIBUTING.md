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

**Site: documentation and status page** (`render.yaml`)

Render deploys the site through its GitHub integration. After a push to `main`, it waits for the
CI checks to pass (`autoDeployTrigger: checksPass`) and rebuilds only when the site, the core
package or the workspace configuration changed (`buildFilter`). There is no deploy workflow and no
deploy secret. To set it up, create a Blueprint in Render from this repository.

Publishing uses npm trusted publishing (GitHub OIDC), so there is no npm token. Each `@unicep/*`
package has a trusted publisher configured on npmjs.com (_package → Settings → Trusted Publisher_)
with organization `thet-ti`, repository `unicep`, workflow `release.yml`, no environment, and
"Allow npm publish" checked. A new package needs the same setup after its first publish, which has
to be done once with a temporary token.

## Repository security (maintainers)

- **Code owners:** [`.github/CODEOWNERS`](.github/CODEOWNERS) requests a review from the owners, and
  the `Protect main` ruleset requires their approval.
- **`Protect main` ruleset:** changes reach `main` only through pull requests with one approval,
  resolved conversations, passing CI checks and a linear history. Force-pushes and branch
  deletion are blocked. Repository admins can bypass it.
- **Merging:** only squash merges are allowed and the branch is deleted afterwards. The squash
  commit uses the PR title, so titles must follow Conventional Commits (the `PR title` check).
- **Workflows:** GitHub Actions are pinned to commit SHAs (Dependabot keeps them updated),
  workflow tokens default to read-only, and workflows from external contributors need approval.
- **Secrets and alerts:** secret scanning, push protection, Dependabot alerts and security
  updates, and private vulnerability reporting are enabled.

The release workflow opens the "version packages" pull request with the workflow token. That
requires "Allow GitHub Actions to create and approve pull requests" to be enabled in the
organization's Actions settings. Pull requests opened with that token do not trigger CI, so an
admin merges them with the ruleset bypass, or the workflow can use a personal access token or a
GitHub App token instead.

## Code of conduct

By participating you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).
