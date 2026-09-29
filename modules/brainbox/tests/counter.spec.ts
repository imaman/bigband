import { abortAllDurableObjects, reset } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { afterEach, describe, expect, it } from 'vitest'

describe('counter', () => {
  // The Workers vitest integration isolates storage per test file, not per test, so wipe it after each test.
  afterEach(async () => {
    await reset()
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

  it('keeps its value across instance restarts', async () => {
    await env.COUNTER.getByName('counter-under-test').increment()
    await env.COUNTER.getByName('counter-under-test').increment()
    // Kills every Durable Object instance but keeps their storage. Stubs are bound to the aborted instance, hence a
    // fresh one is obtained afterwards.
    await abortAllDurableObjects()
    expect(await env.COUNTER.getByName('counter-under-test').increment()).toEqual(3)
  })

  it('does not lose increments under concurrent calls', async () => {
    const counter = env.COUNTER.getByName('counter-under-test')
    const results: number[] = await Promise.all(Array.from({ length: 20 }, async () => counter.increment()))
    expect(results.sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1))
  })
})
