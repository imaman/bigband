import { DurableObject } from 'cloudflare:workers'
import { z } from 'zod'

const Data = z.object({
  n: z.number(),
  day: z.object({ started: z.string(), n: z.number() }),
  hour: z.object({ started: z.string(), n: z.number() }),
  minute: z.object({ started: z.string(), n: z.number() }),
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
    // const d = new Date(now - (now % b.len))
    const k = `usageTracking`
    const r = this.ctx.storage.kv.get(k)
    const parsed = r
      ? Data.parse(r)
      : {
          n: 0,
          day: { started: '1970-01-01Z', n: 0 },
          hour: { started: '1970-01-01Z', n: 0 },
          minute: { started: '1970-01-01Z', n: 0 },
        }
    const n = parsed.n + 1

    const d = align(now, parsed, n, 'day')
    const h = align(now, parsed, n, 'hour')
    const m = align(now, parsed, n, 'minute')

    if (!d && !h && !m) {
      return
    }

    throw new Error(`Exceeded traffic allownce [${d ?? h ?? m}]`)
  }
}

function align(now: number, parsed: Data, n: number, k: keyof typeof buckets) {
  const started = new Date(now - (now % buckets[k])).toISOString()
  if (started > parsed[k].started) {
    parsed[k] = { started, n }
    return
  }

  const consumed = n - parsed[k].n
  return consumed > allowance[k] ? k : undefined
}
