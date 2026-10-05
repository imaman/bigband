import { DurableObject } from 'cloudflare:workers'
import { z } from 'zod'

const timeframes = ['day', 'hour', 'minute'] as const
type Timeframe = (typeof timeframes)[number]

const Data = z.object({
  n: z.number(),
  lastUpdated: z.string(),
  tracking: z.record(z.enum(timeframes), z.object({ started: z.string(), n: z.number() })),
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

export type Allowance = Record<Timeframe, number>

export type TrafficTickResult = number | { tag: 'tooManyRequest'; retryAfterMillis: number }

/**
 * A persistent global bus. All requests for a given name are routed to a single instance, which handles them one at a
 * time, so increments are never lost.
 */
export class Backplane extends DurableObject<Env> {
  private readonly allowance

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.allowance = env.ALLOWANCE
  }

  /**
   * Records one request at `nowMillis` (defaults to the Durable Object's clock). Returns the running request count, or
   * `tooManyRequest` with the time left until the exhausted timeframe ends if the request exceeds `allowance`.
   */
  trafficTick(nowMillis?: number, allowance?: Allowance): TrafficTickResult {
    allowance = allowance ?? this.allowance
    const now = new Date(nowMillis ?? Date.now())
    const r = this.ctx.storage.kv.get(storageKey)
    const data = r
      ? Data.parse(r)
      : ({
          n: 0,
          lastUpdated: '1970-01-01Z',
          tracking: {
            day: { started: '1970-01-01Z', n: 0 },
            hour: { started: '1970-01-01Z', n: 0 },
            minute: { started: '1970-01-01Z', n: 0 },
          },
        } satisfies Data)

    if (now.toISOString() < data.lastUpdated) {
      throw new Error(`Clock is off: ${now.toISOString()}`)
    }
    const n = data.n + 1

    const copy = { ...data.tracking }
    for (const tf of timeframes) {
      copy[tf] = align(now.getTime(), data, n, tf)
    }
    const toWrite = Data.parse({ n, lastUpdated: now.toISOString(), tracking: copy } satisfies Data)
    this.ctx.storage.kv.put(storageKey, toWrite)

    // Compute when can the request be retried, or -1 if it can go in now.
    const retryAt = timeframes.reduce((soFar, tf) => {
      const c = isAllowed(toWrite, tf, allowance)
      if (c) {
        return soFar
      }

      const nextTimeframeStart = Date.parse(toWrite.tracking[tf].started) + buckets[tf]
      return Math.max(soFar, nextTimeframeStart)
    }, -1)
    if (retryAt < 0) {
      return n
    }

    return { tag: 'tooManyRequest', retryAfterMillis: retryAt - now.getTime() }
  }
}

function align(now: number, data: Data, n: number, tf: Timeframe) {
  const started = computeTimeframeStart(now, tf).toISOString()
  if (started > data.tracking[tf].started) {
    return { started, n }
  }

  return data.tracking[tf]
}

function isAllowed(data: Data, tf: Timeframe, allowance: Allowance) {
  const consumed = data.n - data.tracking[tf].n
  return consumed < allowance[tf]
}

const storageKey = `usageTracking`

/**
 * Returns the start of the `tf` timeframe that contains `now`. All timeframes are aligned to the Unix epoch, so for
 * e.g. "hour" this is the top of the UTC hour that `now` falls in.
 */
function computeTimeframeStart(now: number, tf: Timeframe) {
  return new Date(now - (now % buckets[tf]))
}
