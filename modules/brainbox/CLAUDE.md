# brainbox (Cloudflare Worker)

This module is a Cloudflare Worker. Your knowledge of Cloudflare Workers APIs and limits may be outdated: consult
https://developers.cloudflare.com/workers/ (MCP: `https://docs.mcp.cloudflare.com/mcp`) before working on Workers,
KV, R2, D1, Durable Objects, Queues, Vectorize, AI, or Agents SDK code. Limits and quotas live under each product's
`/platform/limits/` page, e.g. `/workers/platform/limits`.

## Commands (run from `modules/brainbox`)

| Command             | Purpose                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `yarn dev`          | Local development server (`vite dev`): the UI with HMR and the worker in workerd         |
| `yarn deploy`       | Build and deploy to Cloudflare (`vite build && wrangler deploy`)                         |
| `yarn preview`      | Build and serve the production output locally (`vite build && vite preview`)             |
| `yarn cf-typegen`   | Regenerate `src/worker-configuration.d.ts` (`wrangler types`)                            |
| `yarn build`        | Type-check and compile `src/` and `tests/` to `dist/` (monorepo standard, via `tsc -b`)  |
| `yarn build-ui`     | Type-check `ui/` (`tsconfig-ui.json`) and `vite build` the UI and worker to `vite-dist/` |
| `yarn test`         | Run the workerd tests (vitest, inside workerd) against `dist/tests`; build first         |
| `yarn test-harness` | Run the harness tests against `vite-dist/`; run `yarn build` and `yarn build-ui` first   |

Run `yarn cf-typegen` after changing bindings in `wrangler.jsonc`. `src/worker-configuration.d.ts` is generated: it
is prettier- and eslint-ignored and carries its own `eslint-disable` header. It lives under `src/` (rather than the
wrangler default of the package root) so that build-raptor, which fingerprints only `src/`, `tests/`, and
`package.json`, rebuilds and retests when the bindings change.

## How this module differs from the other modules

- The module follows Cloudflare's full-stack layout for a Worker with a UI: one package, built by Vite with the
  Cloudflare Vite plugin (https://developers.cloudflare.com/workers/vite-plugin/). The worker lives in `src/` (where
  build-raptor expects it) and the UI (React) in `index.html` + `ui/`. `vite build` bundles both into `vite-dist/`
  (`client/` for the UI, `brainbox/` for the worker) and generates `vite-dist/brainbox/wrangler.json` from
  `wrangler.jsonc`; `wrangler deploy` follows a redirect (`.wrangler/deploy/config.json`) to that generated config.
  So `wrangler.jsonc` is the build's input, not what ships, and it has no `assets` field: the plugin fills it in.
- The compiled `dist/` output is only used for tests. The Vite output directory is `vite-dist/`, not Vite's default
  `dist/` (tsc's), and must not start with `dist`: build-raptor treats an output path that is a string prefix of
  another as a collision.
- `tsconfig-base.json` drops the `DOM` lib; the Workers runtime types in `src/worker-configuration.d.ts` replace it
  (the two conflict) and are compiled as part of `src/`. The UI needs `DOM`, so `ui/` has its own
  `tsconfig-ui.json`, which build-raptor's generated `tsconfig.json` (covering `src/` and `tests/` only) ignores. It
  is type-checked by `yarn build-ui`; Vite itself only strips types. The type-aware lint (`.eslintrc.typed.js`) also
  resolves `ui/` against `tsconfig-ui.json`. `.tsx` files get the React hooks rules (`rules-of-hooks`,
  `exhaustive-deps`) on top of the TypeScript ones.
- Two custom build-raptor tasks (`buildTasks` in package.json) cover the UI, because the standard build and test
  tasks only see `src/`, `tests/` and `dist/`:
  - `build-ui` (label `build`) runs `yarn build-ui`. Its inputs include `ui/`, `src/`, `index.html`,
    `vite.config.ts` and `wrangler.jsonc`; its output is `vite-dist/`. It deletes the `.dev.vars` that the plugin
    copies into the output, so local secrets stay out of build-raptor's cache.
  - `test-harness` (label `test`) runs the harness tests. Listing `vite-dist` and `dist/tests` as inputs makes it
    depend on `build-ui` and `build`, and reruns it whenever the UI or the worker changes.
- Tests use vitest + `@cloudflare/vitest-plugin` instead of jest, so they run inside workerd with the real
  `Request`, `env`, and `ExecutionContext` (`env` and `exports` come from `cloudflare:workers`; the `env`/`SELF`
  exports of `cloudflare:test` are deprecated and fail lint). build-raptor invokes them via the
  custom runner `tools/test-runners/vitest-workers` (declared as `buildRaptor.testCommand` in package.json);
  editing the runner script does not invalidate build-raptor's test cache, changing `testCommand` does.
- `tests/vitest.config.mts` points vitest at the compiled `dist/tests/**/*.spec.js`, like every other module, while
  the `exports.default.fetch()` integration path is bundled by wrangler from `src/index.ts`. The config lives under
  `tests/` (passed via
  `--config`) so that editing it invalidates build-raptor's cache.
- There are two kinds of tests, each with its own vitest config. `tests/vitest.config.mts` runs `*.spec.ts` inside
  the Workers runtime via the Workers vitest integration (build-raptor's standard test task).
  `tests/vitest.harness.config.mts` runs `*.harness.spec.ts` in Node.js (the `test-harness` build task) and drives
  the worker through wrangler's `createTestHarness()`
  (https://developers.cloudflare.com/workers/testing/test-harness/), pointed at the generated
  `vite-dist/brainbox/wrangler.json`: it runs exactly what `wrangler deploy` ships, i.e. Vite's worker bundle with the
  built UI as static assets, under the compatibility date, flags and bindings of the generated config. Keep at least
  one harness test per worker: the Workers vitest integration injects
  extra compatibility flags (`nodejs_compat` among them) so that vitest itself can run in workerd, so an
  `exports.default.fetch()` test
  can pass on code that would throw in production (e.g. `Buffer` under a compatibility date before 2026-08-04).
  The harness is also the only net for Node APIs that `@types/node` declares but workerd does not implement: see the
  partially supported modules and non-functional stubs at
  https://developers.cloudflare.com/workers/runtime-apis/nodejs/ (e.g. `node:http2`, `node:vm`,
  `node:child_process`). Such code type-checks and fails at runtime, so exercise it in a harness test.
  Prefer `*.spec.ts` for anything else; the harness spawns a workerd per test file and is slower.
- Cache-invisible files: `tsconfig-base.json` is not a build-raptor input, and `wrangler.jsonc` is an input of
  `build-ui` (and therefore of `test-harness`) but not of the standard build and test tasks. After editing them, a
  cached build or workerd-test result may be replayed. Force a rerun by also touching `package.json` (e.g. a comment
  in a script), or run `yarn test` from `modules/brainbox` directly.
- Local wrangler state (`.wrangler/`) and secrets (`.dev.vars*`) are gitignored at the repo root.

## Local Explorer (debugging with `yarn dev`)

The dev server (`yarn dev`, i.e. `vite dev` with the Cloudflare plugin) exposes a Local Explorer API for inspecting
local Workers, bindings, and storage, relative to the dev server's URL. Useful endpoints:

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
