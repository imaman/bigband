import { abortAllDurableObjects, reset } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { afterEach, describe, expect, it } from 'vitest'

// Mirrors the allowances in src/counter.ts.
const perMinute = 15
const perHour = 30

const minute = 60 * 1000
const t0 = Date.parse('2030-01-01T00:00:00Z')

/**
 * Calls `provision` once per timestamp, in order. Returns 'ok' for each accepted call and the error message for each
 * rejected one. Rejections are turned into values right away: handing the RPC promise itself to `expect(...).rejects`
 * leaves unhandled rejections behind.
 */
async function runAll(name: string, times: number[]) {
  const counter = env.COUNTER.getByName(name)
  const ret: string[] = []
  for (const t of times) {
    ret.push(
      await counter.trafficTick(t).then(
        () => 'ok',
        (e: unknown) => (e instanceof Error ? e.message : String(e)),
      ),
    )
  }
  return ret
}

/** `count` timestamps, starting at `start`, `step` milliseconds apart. */
function times(count: number, start: number, step: number) {
  return Array.from({ length: count }, (_, i) => start + i * step)
}

describe('counter', () => {
  // The Workers vitest integration isolates storage per test file, not per test, so wipe it after each test.
  afterEach(async () => {
    await reset()
  })

  it('allows up to the per-minute allowance within a minute', async () => {
    expect(await runAll('c', times(15, t0, 1))).toEqual(Array(15).fill('ok'))
  })

  it('rejects the call that exceeds the per-minute allowance', async () => {
    await runAll('c', times(15, t0, 1))
    expect(await runAll('c', [t0 + 15])).toEqual(['Traffic allowance excceded (minute)'])
  })

  it('allows calls again once the next minute starts', async () => {
    await runAll('c', times(perMinute + 1, t0, 1))
    expect(await runAll('c', [t0 + minute])).toEqual(['ok'])
  })

  it('aligns windows to the clock, not to the first call', async () => {
    // A full minute's worth at 00:00:59 does not block 00:01:00: fixed windows, not sliding ones.
    await runAll('c', times(perMinute, t0 + minute - 1000, 1))
    expect(await runAll('c', [t0 + minute])).toEqual(['ok'])
  })

  it('rejects the call that exceeds the per-hour allowance', async () => {
    // One call per minute stays within the per-minute allowance.
    expect(await runAll('c', times(perHour, t0, minute))).toEqual(Array(perHour).fill('ok'))
    expect(await runAll('c', [t0 + perHour * minute])).toEqual([expect.stringMatching(/hour/)])
  })

  it('rejects the call that exceeds the per-day allowance', async () => {
    // One call every five minutes (12 per hour) stays within the per-minute and per-hour allowances.
    const step = 5 * minute
    expect(await runAll('c', times(40, t0, step))).toEqual(Array(40).fill('ok'))
    expect(await runAll('c', [t0 + 40 * step])).toEqual([expect.stringMatching(/day/)])
  })

  it('keeps separate counters apart', async () => {
    await runAll('a', times(perMinute + 1, t0, 1))
    expect(await runAll('b', [t0 + perMinute + 1])).toEqual(['ok'])
  })

  it('keeps its usage across instance restarts', async () => {
    await runAll('c', times(perMinute, t0, 1))
    // Kills every Durable Object instance but keeps their storage. Stubs are bound to the aborted instance, hence a
    // fresh one is obtained afterwards.
    await abortAllDurableObjects()
    expect(await runAll('c', [t0 + perMinute])).toEqual([expect.stringMatching(/minute/)])
  })

  it('does not let concurrent calls exceed the allowance', async () => {
    const counter = env.COUNTER.getByName('c')
    const results = await Promise.allSettled(times(30 + 5, t0, 1).map(async t => counter.trafficTick(t)))
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(30)
  })
})
