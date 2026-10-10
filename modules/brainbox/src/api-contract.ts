import { oc } from '@orpc/contract'
import { z } from 'zod'

/**
 * The API of the worker: the input and output schema of every procedure. The worker implements it
 * (brainbox-service.ts) and the UI calls it. It is a separate, dependency-light module (rather than the UI importing
 * the type of the worker's router) because the UI's TypeScript program cannot load the worker's sources, which rely on
 * the Workers runtime types.
 */
export const contract = {
  greeting: oc
    .input(z.object({ name: z.string().optional() }))
    .output(z.object({ greeting: z.string(), count: z.number(), blended: z.string() })),
}
