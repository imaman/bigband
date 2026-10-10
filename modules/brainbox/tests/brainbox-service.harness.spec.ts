import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestHarness } from 'wrangler'

import { createApiClient } from './api-client.js'
import { failMe } from './fail-me.js'

// This spec runs compiled, from dist/tests/, so the package root is two levels up. Anchor the wrangler config to it
// (rather than to process.cwd(), which is what a relative `configPath` resolves against) so the harness works no
// matter which directory vitest is launched from, same as tests/vitest.config.mts does for the workerd tests.
const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
// The config that `vite build` generates, i.e. the one `wrangler deploy` uses: it runs the worker bundle that Vite
// built and serves the built UI as static assets. See
// https://developers.cloudflare.com/workers/testing/test-harness/configure/
const wranglerConfigPath = path.join(packageRoot, 'vite-dist/brainbox/wrangler.json')

// Follows https://developers.cloudflare.com/workers/testing/test-harness/get-started/
const server = createTestHarness({
  workers: [
    {
      configPath: wranglerConfigPath,
      secrets: { BRAINBOX_SERVICE_SECRET: '12345' },
    },
  ],
})

// Sends the API calls over HTTP, through the static-assets router, the way the UI does. The harness speaks
// Miniflare's Request/Response classes, hence the copying.
const api = createApiClient('http://localhost', async request => {
  const response = await server.fetch(new URL(request.url).pathname, {
    method: request.method,
    headers: [...request.headers],
    body: await request.text(),
  })
  return new Response(await response.arrayBuffer(), { status: response.status, headers: [...response.headers] })
})

// A greeting call at the HTTP level, for tests that inspect the response itself (status, body) rather than the
// result. `{ json: <input> }` is the request body of oRPC's RPC protocol.
const rawGreeting = () =>
  server.fetch('/api/greeting', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ json: {} }),
  })

// Out-of-process tests of the worker as deployed:
// - Runs exactly what `wrangler deploy` ships: the worker and UI bundles of `vite build`, with the compatibility
//   date, flags and bindings of the wrangler.json it generated (from `wrangler.jsonc`).
// - The tests run out of process and reach the worker over HTTP, including the static-assets router.
// - Catches code that relies on APIs the deployed worker lacks.
// - Tests cannot reach inside the worker (no fake timers, no direct `env` access).
describe('brainbox-service.harness', () => {
  beforeAll(async () => {
    await server.listen()
  })

  afterEach(async () => {
    await server.reset()
  })

  afterAll(async () => {
    await server.close()
  })

  it('serves the built UI at /', async () => {
    const response = await server.fetch('/')
    expect(response.status).toEqual(200)
    const html = await response.text()
    expect(html).toMatch(/<title>Brainbox<\/title>/)
    // The built page (vite-dist/client/index.html) loads the hashed bundle rather than the ui/ sources.
    expect(html).toMatch(/<script type="module"[^>]* src="\/assets\/index-[\w-]+\.js"/)
    expect(server.getLogs().filter(log => log.level === 'error')).toEqual([])
  })

  it('429s when traffic volume exceeds allowance', async () => {
    await server.update(o => ({
      ...o,
      workers: o.workers.map(w =>
        'configPath' in w
          ? { ...w, vars: { ...(w.vars ?? {}), ALLOWANCE: { minute: 2, hour: 3, day: 4 } } }
          : failMe('no vars'),
      ),
    }))

    const all: unknown[] = []
    for (let i = 0; i < 10; ++i) {
      const resp = await rawGreeting()
      all.push([resp.status, await resp.text()])
    }

    expect(all[0]).toEqual([200, expect.stringContaining('Hello, stranger!')])
    expect(all.at(-1)).toEqual([429, 'Too many requests'])
  })

  it('routes /api/greeting past the asset router to the worker', async () => {
    expect(await api.greeting({ name: 'alice' })).toEqual({
      greeting: 'Hello, alice!',
      count: expect.any(Number),
      blended: expect.any(String),
    })
  })

  it('lets an error thrown while handling a request escape to the runtime', async () => {
    // An empty secret makes the greeting handler throw. The error must propagate out of the worker's `fetch` (so that
    // Cloudflare records the invocation as an exception) rather than be turned into a 500 response by the worker.
    // Both end up as a 500; they differ in the body: locally, the runtime answers an uncaught exception with the
    // error itself, whereas a handled error yields whatever the worker returns (oRPC's error response, a JSON
    // document).
    await server.update(o => ({
      ...o,
      workers: o.workers.map(w =>
        'configPath' in w
          ? { ...w, secrets: { ...(w.secrets ?? {}), BRAINBOX_SERVICE_SECRET: '' } }
          : failMe('no secrets'),
      ),
    }))

    const response = await rawGreeting()
    expect(response.status).toEqual(500)
    expect(await response.text()).toMatch(/^Error: Key must be a non-empty string/)
  })
})
