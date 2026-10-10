import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from 'vitest'
import { createTestHarness } from 'wrangler'

import { failMe } from './fail-me.js'

// Follows https://developers.cloudflare.com/workers/testing/test-harness/get-started/
// `wranglerConfigPath` is provided by tests/vitest.harness.config.mts (see tests/vite-dist.mts).
const server = createTestHarness({
  workers: [
    {
      configPath: inject('wranglerConfigPath'),
      secrets: { BRAINBOX_SERVICE_SECRET: '12345' },
    },
  ],
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
      const resp = await server.fetch('/api/greeting')
      all.push(resp.status === 200 ? await resp.json() : [resp.status, await resp.text()])
    }

    expect(all[0]).toMatchObject({ greeting: 'Hello, stranger!' })
    expect(all.at(-1)).toEqual([429, 'Too many requests'])
  })

  it('routes /api/greeting past the asset router to the worker', async () => {
    const response = await server.fetch('/api/greeting?name=alice')
    expect(response.status).toEqual(200)
    expect(await response.json()).toEqual({
      greeting: 'Hello, alice!',
      count: expect.any(Number),
      blended: expect.any(String),
    })
  })

  it('lets an error thrown while handling a request escape to the runtime', async () => {
    // An empty secret makes the greeting handler throw. The error must propagate out of the worker's `fetch` (so that
    // Cloudflare records the invocation as an exception) rather than be turned into a 500 response by the worker.
    // Both end up as a 500; they differ in the body: locally, the runtime answers an uncaught exception with the
    // error itself, whereas a handled error yields whatever the worker returns (Hono's default: 'Internal Server
    // Error').
    await server.update(o => ({
      ...o,
      workers: o.workers.map(w =>
        'configPath' in w
          ? { ...w, secrets: { ...(w.secrets ?? {}), BRAINBOX_SERVICE_SECRET: '' } }
          : failMe('no secrets'),
      ),
    }))

    const response = await server.fetch('/api/greeting')
    expect(response.status).toEqual(500)
    expect(await response.text()).toMatch(/^Error: Key must be a non-empty string/)
  })
})
