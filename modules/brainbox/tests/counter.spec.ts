import { abortAllDurableObjects, reset } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { afterEach, describe, expect, it } from 'vitest'

import { Allowance } from '../src/counter.js'

/**
 * Calls `trafficTick` once per timestamp, in order. Returns 'ok' for each accepted call and the error message for each
 * rejected one. Rejections are turned into values right away: handing the RPC promise itself to `expect(...).rejects`
 * leaves unhandled rejections behind.
 */
async function run(timestamps: number[], allowance: Partial<Allowance>, name = 'c') {
  const counter = env.COUNTER.getByName(name)
  const ret: string[] = []
  for (const t of timestamps) {
    ret.push(
      await counter
        .trafficTick(t, {
          day: Number.MAX_SAFE_INTEGER,
          hour: Number.MAX_SAFE_INTEGER,
          minute: Number.MAX_SAFE_INTEGER,
          ...allowance,
        })
        .then(
          () => 'ok',
          (e: unknown) => (e instanceof Error ? e.message : String(e)),
        ),
    )
  }
  return ret
}

function steps(unit: 'hours' | 'minutes' | 'seconds', ...vals: number[]) {
  const t0 = Date.parse('2030-01-01T00:00:00Z')

  const millis = {
    seconds: 1000,
    minutes: 1000 * 60,
    hours: 1000 * 60 * 60,
  }

  return vals.map(at => t0 + millis[unit] * at)
}

function runSteps(allowance: Partial<Allowance>, unit: 'hours' | 'minutes' | 'seconds', ...vals: number[]) {
  return run(steps(unit, ...vals), allowance)
}

describe('counter', () => {
  // The Workers vitest integration isolates storage per test file, not per test, so wipe it after each test.
  afterEach(async () => {
    await reset()
  })

  it('allows up to the given per-minute allowance, rejects overage', async () => {
    expect(await runSteps({ minute: 4 }, 'seconds', 2, 30, 50, 58, 59)).toEqual([
      'ok',
      'ok',
      'ok',
      'ok',
      'Traffic allowance excceded (minute)',
    ])
  })
  it('allows up to the given per-hour allowance, rejects overage', async () => {
    expect(await runSteps({ hour: 4 }, 'seconds', 2, 30, 40, 50, 59)).toEqual([
      'ok',
      'ok',
      'ok',
      'ok',
      'Traffic allowance excceded (hour)',
    ])
  })
  it('allows up to the given per-day allowance, rejects overage', async () => {
    expect(await runSteps({ day: 3 }, 'hours', 1, 21, 22, 23)).toEqual([
      'ok',
      'ok',
      'ok',
      'Traffic allowance excceded (day)',
    ])
  })
  it('reallows when a new daily timeframe starts', async () => {
    expect(await runSteps({ day: 3 }, 'hours', 3, 20, 21, 22, 23, 25, 26)).toEqual([
      'ok',
      'ok',
      'ok',
      'Traffic allowance excceded (day)',
      'Traffic allowance excceded (day)',
      'ok',
      'ok',
    ])
  })
  it('reallows when a new hourly timeframe starts', async () => {
    expect(await runSteps({ hour: 4 }, 'minutes', 50, 52, 56, 57, 58, 59, 61, 62)).toEqual([
      'ok',
      'ok',
      'ok',
      'ok',
      'Traffic allowance excceded (hour)',
      'Traffic allowance excceded (hour)',
      'ok',
      'ok',
    ])
  })
  it('reallows when a new minutely timeframe starts', async () => {
    expect(await runSteps({ minute: 5 }, 'seconds', 50, 52, 55, 56, 57, 58, 59, 61, 62)).toEqual([
      'ok',
      'ok',
      'ok',
      'ok',
      'ok',
      'Traffic allowance excceded (minute)',
      'Traffic allowance excceded (minute)',
      'ok',
      'ok',
    ])
  })

  it('keeps its usage across instance restarts', async () => {
    expect(await runSteps({ hour: 3 }, 'minutes', 1, 40, 50, 52)).toEqual([
      'ok',
      'ok',
      'ok',
      'Traffic allowance excceded (hour)',
    ])
    await abortAllDurableObjects()

    expect(await runSteps({ hour: 3 }, 'minutes', 53, 54, 59, 61, 62)).toEqual([
      'Traffic allowance excceded (hour)',
      'Traffic allowance excceded (hour)',
      'Traffic allowance excceded (hour)',
      'ok',
      'ok',
    ])
  })

  it('keeps separate counters apart', async () => {
    expect(await run(steps('minutes', 1, 40, 50, 52), { hour: 3 }, 'alpha')).toEqual([
      'ok',
      'ok',
      'ok',
      'Traffic allowance excceded (hour)',
    ])
    expect(await run(steps('minutes', 53, 54), { hour: 3 }, 'beta')).toEqual(['ok', 'ok'])
  })

  it('allows same-timestamp requests', async () => {
    expect(await runSteps({ minute: 2 }, 'seconds', 7, 7, 7)).toEqual([
      'ok',
      'ok',
      'Traffic allowance excceded (minute)',
    ])
  })
})
