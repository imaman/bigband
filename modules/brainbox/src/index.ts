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
  return new Response(`Hello Worker - ${new Date()}`)
}

const fetch: ExportedHandlerFetchHandler<Env> = async request => handleRequest(request)

// Typed via the handler (rather than `ExportedHandler<Env>`, where `fetch` is optional) so tests can call
// `worker.fetch` directly.
const worker = { fetch }

export default worker
