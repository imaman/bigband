import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestHarness } from 'wrangler'

// This spec runs compiled, from dist/tests/, so the package root is two levels up. Anchor the wrangler config to it
// (rather than to process.cwd(), which is what a relative `configPath` resolves against) so the harness works no
// matter which directory vitest is launched from, same as tests/vitest.config.mts does for the workerd project.
const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const wranglerConfigPath = path.join(packageRoot, 'wrangler.jsonc')

// Follows https://developers.cloudflare.com/workers/testing/test-harness/get-started/
const server = createTestHarness({
  workers: [{ configPath: wranglerConfigPath }],
})

// Out-of-process tests of the worker as deployed:
// - Wrangler bundles and runs the worker exactly as `wrangler dev` / `wrangler deploy` do, with the compatibility
//   date, flags and bindings of `wrangler.jsonc`.
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

  it('responds with a greeting under the deployed compatibility settings', async () => {
    const response = await server.fetch('/')
    expect(response.status).toEqual(200)
    expect(await response.text()).toMatch(/<title>Brainbox<\/title>/)
    expect(server.getLogs().filter(log => log.level === 'error')).toEqual([])
  })

  it('increments the request count across requests', async () => {
    const first = await (await server.fetch('/api/greeting')).json()
    expect(first).toMatchObject({ count: 1 })
    const second = await (await server.fetch('/api/greeting')).json()
    expect(second).toMatchObject({ count: 2 })
  })

  it('routes /api/greeting past the asset router to the worker', async () => {
    const response = await server.fetch('/api/greeting?name=alice')
    expect(response.status).toEqual(200)
    expect(await response.json()).toEqual({ greeting: 'Hello, alice!', count: expect.any(Number) })
  })
})
