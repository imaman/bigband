import { DurableObject } from 'cloudflare:workers'

const minute = 60 * 1000
const hour = 60 * minute
const day = 24 * hour

const buckets = [
  { len: minute, allowance: 2_000, name: 'minute' },
  { len: hour, allowance: 10_000, name: 'hour' },
  { len: day, allowance: 50_000, name: 'day' },
]

/**
 * A persistent counter. All requests for a given name are routed to a single instance, which handles them one at a
 * time, so increments are never lost.
 */
export class Counter extends DurableObject<Env> {
  /** Adds one to the counter and returns the new value (1 on the first call). */
  provision(now: number) {
    for (const b of buckets) {
      const d = new Date(now - (now % b.len))
      const k = `usage-${b.name}-${d.toISOString()}`
      // The synchronous KV API of SQLite-backed Durable Objects: no `await` between the read and the write, so no other
      // request can interleave.
      const next = (this.ctx.storage.kv.get<number>(k) ?? 0) + 1
      this.ctx.storage.kv.put(k, next)
      if (next > b.allowance) {
        throw new Error(`Traffic spike protection kicked in`)
      }
    }
  }
}
