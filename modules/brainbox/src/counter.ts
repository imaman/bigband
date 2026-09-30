import { DurableObject } from 'cloudflare:workers'
import { z } from 'zod'

const ws = ['day', 'hour', 'minute'] as const

const Data = z.object({
  n: z.number(),
  tracking: z.record(z.enum(ws), z.object({ started: z.string(), n: z.number() })),
})
type Data = z.infer<typeof Data>

const minute = 60 * 1000
const hour = 60 * minute
const day = 24 * hour

const buckets = {
  minute,
  hour,
  day,
} as const

const allowance = {
  day: 100,
  hour: 30,
  minute: 15,
}

/**
 * A persistent counter. All requests for a given name are routed to a single instance, which handles them one at a
 * time, so increments are never lost.
 */
export class Counter extends DurableObject<Env> {
  /** Adds one to the counter and returns the new value (1 on the first call). */
  provision(now: number) {
    const r = this.ctx.storage.kv.get(storageKey)
    const data = r
      ? Data.parse(r)
      : ({
          n: 0,
          tracking: {
            day: { started: '1970-01-01Z', n: 0 },
            hour: { started: '1970-01-01Z', n: 0 },
            minute: { started: '1970-01-01Z', n: 0 },
          },
        } satisfies Data)
    const n = data.n + 1

    const day = align(now, data, n, 'day')
    const hour = align(now, data, n, 'hour')
    const minute = align(now, data, n, 'minute')

    const next = { n, tracking: { day, hour, minute } } satisfies Data
    this.ctx.storage.kv.put(storageKey, next)

    check('day', next)
    check('hour', next)
    check('minute', next)
  }
}

function align(now: number, data: Data, n: number, k: keyof typeof buckets) {
  const started = new Date(now - (now % buckets[k])).toISOString()
  if (started > data.tracking[k].started) {
    return { started, n }
  }

  return data.tracking[k]
}

function check(k: keyof typeof buckets, data: Data) {
  const consumed = data.n - data.tracking[k].n
  if (consumed >= allowance[k]) {
    throw new Error(`Traffic allowance excceded (${k})`)
  }
}

const storageKey = `usageTracking`
