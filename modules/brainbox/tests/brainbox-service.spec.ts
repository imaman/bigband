import { reset } from 'cloudflare:test'
import { exports } from 'cloudflare:workers'
import { afterEach, describe, expect, it, vi } from 'vitest'

describe('brainbox-service', () => {
  // The Workers vitest integration isolates storage per test file, not per test, so wipe it after each test.
  afterEach(async () => {
    await reset()
    vi.useRealTimers()
  })

  it('responds with a greeting', async () => {
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

  it('responds with 404 to an unknown path', async () => {
    const response = await exports.default.fetch('https://example.com/no-such-path')
    expect(response.status).toEqual(404)
  })

  it('responds with 429 once the per-minute allowance is used up', async () => {
    // Pins the clock (only `Date`) so that the requests cannot straddle a minute boundary.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2030-01-01T00:00:10Z'))
    // The default per-minute allowance of `Counter.trafficTick` is 15.
    for (let i = 0; i < 15; ++i) {
      const response = await exports.default.fetch('https://example.com/api/greeting')
      expect(response.status).toEqual(200)
    }
    const response = await exports.default.fetch('https://example.com/api/greeting')
    expect(response.status).toEqual(429)
    // 00:00:10 leaves 50 seconds of the current minute.
    expect(response.headers.get('Retry-After')).toEqual('50')
  })
})
