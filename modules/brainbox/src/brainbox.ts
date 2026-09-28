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
 * function. Every request that reaches the worker increments the request counter.
 */
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const count = await env.COUNTER.getByName('requests').increment()
  const url = new URL(request.url)

  if (url.pathname === '/api/greeting') {
    const name = url.searchParams.get('name')?.trim() || 'stranger'
    return Response.json({ greeting: `Hello, ${name}!`, count })
  }

  // Files under public/ are served by the asset router before the worker runs, so an unmatched path here is a
  // genuine miss.
  return new Response('Not found', { status: 404 })
}

// `satisfies` (rather than a type annotation) checks the object against `ExportedHandler<Env>` while keeping the
// inferred type, so `fetch` stays required and tests can call `worker.fetch` directly.
export const brainbox = {
  async fetch(request, env, _ctx) {
    return handleRequest(request, env)
  },
} satisfies ExportedHandler<Env>
