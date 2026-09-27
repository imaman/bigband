import { DurableObject } from 'cloudflare:workers'

/**
 * A persistent counter. All requests for a given name are routed to a single instance, which handles them one at a
 * time, so increments are never lost.
 */
export class Counter extends DurableObject<Env> {
  /** Adds one to the counter and returns the new value (1 on the first call). */
  increment(): number {
    // The synchronous KV API of SQLite-backed Durable Objects: no `await` between the read and the write, so no other
    // request can interleave.
    const next = (this.ctx.storage.kv.get<number>('value') ?? 0) + 1
    this.ctx.storage.kv.put('value', next)
    return next
  }
}
