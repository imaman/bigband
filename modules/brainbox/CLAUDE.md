# brainbox (Cloudflare Worker)

This module is a Cloudflare Worker. Your knowledge of Cloudflare Workers APIs and limits may be outdated: consult
https://developers.cloudflare.com/workers/ (MCP: `https://docs.mcp.cloudflare.com/mcp`) before working on Workers,
KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK code. Limits and quotas live under each product's
`/platform/limits/` page, e.g. `/workers/platform/limits`.

## Commands (run from `modules/brainbox`)

| Command           | Purpose                                                             |
| ----------------- | ------------------------------------------------------------------- |
| `yarn dev`        | Local development server (`wrangler dev`)                           |
| `yarn deploy`     | Deploy to Cloudflare (`wrangler deploy`)                            |
| `yarn cf-typegen` | Regenerate `src/worker-configuration.d.ts` (`wrangler types`)       |
| `yarn build`      | Type-check and compile to `dist/` (monorepo standard, via `tsc -b`) |
| `yarn test`       | Run vitest (inside workerd) against `dist/tests`; build first       |

Run `yarn cf-typegen` after changing bindings in `wrangler.jsonc`. `src/worker-configuration.d.ts` is generated: it
is prettier- and eslint-ignored and carries its own `eslint-disable` header. It lives under `src/` (rather than the
wrangler default of the package root) so that build-raptor, which fingerprints only `src/`, `tests/`, and
`package.json`, rebuilds and retests when the bindings change.

## How this module differs from the other modules

- The compiled `dist/` output is only used for tests. Wrangler bundles the worker straight from `src/index.ts`.
- `tsconfig-base.json` drops the `DOM` lib; the Workers runtime types in `src/worker-configuration.d.ts` replace it
  (the two conflict) and are compiled as part of `src/`.
- Tests use vitest + `@cloudflare/vitest-plugin` instead of jest, so they run inside workerd with the real
  `Request`, `env`, and `ExecutionContext` (`env` and `exports` come from `cloudflare:workers`; the `env`/`SELF`
  exports of `cloudflare:test` are deprecated and fail lint). build-raptor invokes them via the
  custom runner `tools/test-runners/vitest-workers` (declared as `buildRaptor.testCommand` in package.json);
  editing the runner script does not invalidate build-raptor's test cache, changing `testCommand` does.
- `tests/vitest.config.mts` points vitest at the compiled `dist/tests/**/*.spec.js`, like every other module, while
  the `exports.default.fetch()` integration path is bundled by wrangler from `src/index.ts`. The config lives under
  `tests/` (passed via
  `--config`) so that editing it invalidates build-raptor's cache.
- The vitest config defines two projects. `workerd` runs `*.spec.ts` inside the Workers runtime via the Workers vitest
  integration. `harness` runs `*.harness.spec.ts` in Node.js and drives the worker through wrangler's
  `createTestHarness()` (https://developers.cloudflare.com/workers/testing/test-harness/), i.e. the same way
  `wrangler dev`/`wrangler deploy` run it: bundled from `src/index.ts` with exactly the compatibility date, flags and
  bindings of `wrangler.jsonc`. Keep at least one harness test per worker: the Workers vitest integration injects
  extra compatibility flags (`nodejs_compat` among them) so that vitest itself can run in workerd, so an
  `exports.default.fetch()` test
  can pass on code that would throw in production (e.g. `Buffer` under a compatibility date before 2026-08-04).
  Prefer `*.spec.ts` for anything else; the harness spawns a workerd per test file and is slower.
- Cache-invisible files: `wrangler.jsonc` and `tsconfig-base.json` are not build-raptor inputs, so after editing
  them a cached build/test result may be replayed. Force a rerun by also touching `package.json` (e.g. a comment in
  a script), or run `yarn test` from `modules/brainbox` directly.
- Local wrangler state (`.wrangler/`) and secrets (`.dev.vars*`) are gitignored at the repo root.

## Local Explorer (debugging with `yarn dev`)

`wrangler dev` exposes a Local Explorer API for inspecting local Workers, bindings, and storage; the base URL is
printed when the dev server starts. Useful endpoints (relative to that URL):

| Endpoint                                                             | Description                                |
| -------------------------------------------------------------------- | ------------------------------------------ |
| `GET /cdn-cgi/local/explorer/api/local/workers`                      | List local Workers and their bindings      |
| `GET /cdn-cgi/local/explorer/api/storage/kv/namespaces`              | List KV namespaces                         |
| `GET /cdn-cgi/local/explorer/api/d1/database`                        | List D1 databases                          |
| `GET /cdn-cgi/local/explorer/api/r2/buckets`                         | List R2 buckets                            |
| `GET /cdn-cgi/local/explorer/api/workers/durable_objects/namespaces` | List Durable Object namespaces             |
| `POST /cdn-cgi/local/explorer/api/local/observability/query`         | Read-only SQL over `spans` / `logs` tables |
| `POST /cdn-cgi/local/explorer/api/local/observability/clear`         | Clear captured traces and logs             |

Full OpenAPI schema (large): `GET /cdn-cgi/local/explorer/api`.

## References

- Node.js compatibility: https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Errors (e.g. 1102, CPU/memory exceeded): https://developers.cloudflare.com/workers/observability/errors/
- Durable Objects best practices: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- Workflows best practices: https://developers.cloudflare.com/workflows/build/rules-of-workflows/
