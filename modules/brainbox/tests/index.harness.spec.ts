import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestHarness } from 'wrangler'

// This spec runs compiled, from dist/tests/, so the package root is two levels up. Anchor the wrangler config to it
// (rather than to process.cwd(), which is what a relative `configPath` resolves against) so the harness works no
// matter which directory vitest is launched from, same as tests/vitest.config.mts does for the workerd project.
const packageRoot = fileURLToPath(new URL('../..', import.meta.url))
const wranglerConfigPath = path.join(packageRoot, 'wrangler.jsonc')

// Runs the worker the way `wrangler dev` / `wrangler deploy` do: wrangler bundles `src/index.ts` and starts it in
// workerd with exactly the compatibility date, flags and bindings of `wrangler.jsonc`. The tests in `index.spec.ts`
// run inside the Workers vitest integration instead, which adds compatibility flags of its own (e.g. `nodejs_compat`)
// so that vitest can run in workerd; they can therefore pass on code that relies on APIs the deployed worker lacks.
// Follows https://developers.cloudflare.com/workers/testing/test-harness/get-started/
const server = createTestHarness({
  workers: [{ configPath: wranglerConfigPath }],
})

describe('brainbox (test harness)', () => {
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
    expect(await response.text()).toMatch(/^Hello Worker - /)
    expect(server.getLogs().filter(log => log.level === 'error')).toEqual([])
  })
})
