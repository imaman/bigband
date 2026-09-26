import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { env, exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import worker from '../src/index.js'

describe('brainbox', () => {
  it('responds with a greeting (unit style)', async () => {
    const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/greeting?name=alice')
    const ctx = createExecutionContext()
    const response = await worker.fetch(request, env, ctx)
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before asserting
    await waitOnExecutionContext(ctx)
    expect(response.status).toEqual(200)
    expect(await response.json()).toEqual({ greeting: 'Hello, alice!' })
  })

  it('responds with a greeting (integration style)', async () => {
    const response = await exports.default.fetch('https://example.com/api/greeting?name=alice')
    expect(response.status).toEqual(200)
    expect(await response.json()).toEqual({ greeting: 'Hello, alice!' })
  })

  it('responds with JSON', async () => {
    const response = await exports.default.fetch('https://example.com/api/greeting?name=alice')
    expect(response.headers.get('content-type')).toMatch(/^application\/json/)
  })

  it('trims the name', async () => {
    const response = await exports.default.fetch('https://example.com/api/greeting?name=%20alice%20')
    expect(await response.json()).toEqual({ greeting: 'Hello, alice!' })
  })

  it('greets a stranger when the name is missing', async () => {
    const response = await exports.default.fetch('https://example.com/api/greeting')
    expect(await response.json()).toEqual({ greeting: 'Hello, stranger!' })
  })

  it('greets a stranger when the name is empty or whitespace only', async () => {
    const empty = await exports.default.fetch('https://example.com/api/greeting?name=')
    expect(await empty.json()).toEqual({ greeting: 'Hello, stranger!' })
    const blank = await exports.default.fetch('https://example.com/api/greeting?name=%20%20')
    expect(await blank.json()).toEqual({ greeting: 'Hello, stranger!' })
  })

  it('responds with 404 to an unknown path', async () => {
    const response = await exports.default.fetch('https://example.com/no-such-path')
    expect(response.status).toEqual(404)
  })
})
