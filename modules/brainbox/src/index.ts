/**
 * Cloudflare Worker entry point.
 *
 * - `yarn dev` starts a local development server (http://localhost:8787/)
 * - `yarn deploy` publishes the worker
 * - `yarn cf-typegen` regenerates `worker-configuration.d.ts` (the `Env` type) after changing bindings in
 *   `wrangler.jsonc`
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

/**
 * Handles a single incoming request. Kept separate from the `fetch` export so request handling stays a plain
 * function.
 */
export function handleRequest(_request: Request): Response {
  return new Response(`Hello Worker - ${new Date().toISOString()}`)
}

// `satisfies` (rather than a type annotation) checks the object against `ExportedHandler<Env>` while keeping the
// inferred type, so `fetch` stays required and tests can call `worker.fetch` directly.
export default {
  async fetch(request, _env, _ctx) {
    return handleRequest(request)
  },
} satisfies ExportedHandler<Env>
