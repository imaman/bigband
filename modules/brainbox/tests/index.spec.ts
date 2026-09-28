import { createExecutionContext, reset, waitOnExecutionContext } from 'cloudflare:test'
import { env, exports } from 'cloudflare:workers'
import { afterEach, describe, expect, it } from 'vitest'

import { brainbox } from '../src/brainbox.js'
const worker = brainbox

describe('brainbox', () => {
  // The Workers vitest integration isolates storage per test file, not per test, so wipe it after each test.
  afterEach(async () => {
    await reset()
  })

  it('responds with a greeting (unit style)', async () => {
    const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/greeting?name=alice')
    const ctx = createExecutionContext()
    const response = await worker.fetch(request, env, ctx)
    // Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before asserting
    await waitOnExecutionContext(ctx)
    expect(response.status).toEqual(200)
    expect(await response.json()).toMatchObject({ greeting: 'Hello, alice!' })
  })

  it('responds with a greeting (integration style)', async () => {
    const response = await exports.default.fetch('https://example.com/api/greeting?name=alice')
    expect(response.status).toEqual(200)
    expect(await response.json()).toMatchObject({ greeting: 'Hello, alice!' })
  })

  it('responds with JSON', async () => {
    const response = await exports.default.fetch('https://example.com/api/greeting?name=alice')
    expect(response.headers.get('content-type')).toMatch(/^application\/json/)
  })

  it('trims the name', async () => {
    const response = await exports.default.fetch('https://example.com/api/greeting?name=%20alice%20')
    expect(await response.json()).toMatchObject({ greeting: 'Hello, alice!' })
  })

  it('greets a stranger when the name is missing', async () => {
    const response = await exports.default.fetch('https://example.com/api/greeting')
    expect(await response.json()).toMatchObject({ greeting: 'Hello, stranger!' })
  })

  it('greets a stranger when the name is empty or whitespace only', async () => {
    const empty = await exports.default.fetch('https://example.com/api/greeting?name=')
    expect(await empty.json()).toMatchObject({ greeting: 'Hello, stranger!' })
    const blank = await exports.default.fetch('https://example.com/api/greeting?name=%20%20')
    expect(await blank.json()).toMatchObject({ greeting: 'Hello, stranger!' })
  })

  it('includes the request count in the greeting', async () => {
    const first = await exports.default.fetch('https://example.com/api/greeting?name=alice')
    expect(await first.json()).toEqual({ greeting: 'Hello, alice!', count: 1 })
    const second = await exports.default.fetch('https://example.com/api/greeting?name=alice')
    expect(await second.json()).toEqual({ greeting: 'Hello, alice!', count: 2 })
  })

  it('counts every request that reaches the worker, not only greetings', async () => {
    await exports.default.fetch('https://example.com/no-such-path')
    const response = await exports.default.fetch('https://example.com/api/greeting')
    expect(await response.json()).toMatchObject({ count: 2 })
  })

  it('increments a counter by one per call', async () => {
    const counter = env.COUNTER.getByName('counter-under-test')
    expect(await counter.increment()).toEqual(1)
    expect(await counter.increment()).toEqual(2)
    expect(await counter.increment()).toEqual(3)
  })

  it('keeps separate counters apart', async () => {
    expect(await env.COUNTER.getByName('a').increment()).toEqual(1)
    expect(await env.COUNTER.getByName('b').increment()).toEqual(1)
    expect(await env.COUNTER.getByName('a').increment()).toEqual(2)
  })

  it('responds with 404 to an unknown path', async () => {
    const response = await exports.default.fetch('https://example.com/no-such-path')
    expect(response.status).toEqual(404)
  })
})
