import { DurableObject } from 'cloudflare:workers'
import { z } from 'zod'

const timeframes = ['day', 'hour', 'minute'] as const
type Timeframe = (typeof timeframes)[number]

const Data = z.object({
  n: z.number(),
  tracking: z.record(z.enum(timeframes), z.object({ started: z.string(), n: z.number() })),
})
type Data = z.infer<typeof Data>

const minute = 60 * 1000
const hour = 60 * minute
const day = 24 * hour

const buckets = {
  minute: { millis: minute, allowance: 15 },
  hour: { millis: hour, allowance: 30 },
  day: { millis: day, allowance: 15 },
} as const

/**
 * A persistent counter. All requests for a given name are routed to a single instance, which handles them one at a
 * time, so increments are never lost.
 */
export class Counter extends DurableObject<Env> {
  /** Adds one to the counter and returns the new value (1 on the first call). */
  trafficTick(now: number) {
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

    const copy = { ...data.tracking }
    for (const tf of timeframes) {
      copy[tf] = align(now, data, n, tf)
    }
    const next = Data.parse({ n, tracking: copy } satisfies Data)
    this.ctx.storage.kv.put(storageKey, next)

    for (const tf of timeframes) {
      check(next, tf)
    }
  }
}

function align(now: number, data: Data, n: number, tf: Timeframe) {
  const started = new Date(now - (now % buckets[tf].millis)).toISOString()
  if (started > data.tracking[tf].started) {
    return { started, n }
  }

  return data.tracking[tf]
}

function check(data: Data, tf: Timeframe) {
  const consumed = data.n - data.tracking[tf].n
  if (consumed >= buckets[tf].allowance) {
    throw new Error(`Traffic allowance excceded (${tf})`)
  }
}

const storageKey = `usageTracking`
