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
| `yarn cf-typegen` | Regenerate `worker-configuration.d.ts` (`wrangler types`)           |
| `yarn build`      | Type-check and compile to `dist/` (monorepo standard, via `tsc -b`) |
| `yarn test`       | Run vitest (inside workerd) against `dist/tests`; build first       |

Run `yarn cf-typegen` after changing bindings in `wrangler.jsonc`. `worker-configuration.d.ts` is generated: it is
prettier-ignored and carries its own `eslint-disable` header.

## How this module differs from the other modules

- The compiled `dist/` output is only used for tests. Wrangler bundles the worker straight from `src/index.ts`.
- `tsconfig-base.json` drops the `DOM` lib and pulls in the Workers runtime types instead; the two conflict.
- Tests use vitest + `@cloudflare/vitest-plugin` instead of jest, so they run inside workerd with the real
  `Request`, `env`, and `ExecutionContext` (imported from `cloudflare:test`). build-raptor invokes them via the
  custom runner `tools/test-runners/vitest-workers` (declared as `buildRaptor.testCommand` in package.json);
  editing the runner script does not invalidate build-raptor's test cache, changing `testCommand` does.
- `vitest.config.mts` points vitest at the compiled `dist/tests/**/*.spec.js`, like every other module, while the
  `SELF` integration path is bundled by wrangler from `src/index.ts`.
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
