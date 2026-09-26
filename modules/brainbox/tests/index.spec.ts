import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { env, exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import worker from '../src/index.js'

describe('brainbox', () => {
  it('responds with a greeting (unit style)', async () => {
    const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com')
    const ctx = createExecutionContext()
    const response = await worker.fetch(request, env, ctx)
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before asserting
    await waitOnExecutionContext(ctx)
    expect(response.status).toEqual(200)
    expect(await response.text()).toMatch(/^Hello Worker - /)
  })

  it('responds with a greeting (integration style)', async () => {
    const response = await exports.default.fetch('https://example.com')
    expect(response.status).toEqual(200)
    expect(await response.text()).toMatch(/^Hello Worker - /)
  })
})
