import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestHarness } from 'wrangler'

// Runs the worker the way `wrangler dev` / `wrangler deploy` do: wrangler bundles `src/index.ts` and starts it in
// workerd with exactly the compatibility date, flags and bindings of `wrangler.jsonc`. The tests in `index.spec.ts`
// run inside the Workers vitest integration instead, which adds compatibility flags of its own (e.g. `nodejs_compat`)
// so that vitest can run in workerd; they can therefore pass on code that relies on APIs the deployed worker lacks.
// Follows https://developers.cloudflare.com/workers/testing/test-harness/get-started/
const server = createTestHarness({
  workers: [{ configPath: './wrangler.jsonc' }],
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
