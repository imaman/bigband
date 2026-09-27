import { z } from 'zod'

/** The JSON body of a `/api/greeting` response. */
export const GreetingResponse = z.object({ greeting: z.string(), count: z.number().int().positive() })
