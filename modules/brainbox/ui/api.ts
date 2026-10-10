import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { ContractRouterClient } from '@orpc/contract'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

import type { contract } from '../src/api-contract.js'

const client: ContractRouterClient<typeof contract> = createORPCClient(new RPCLink({ url: `${location.origin}/api` }))

/** React Query bindings of the worker's API, e.g. `useQuery(orpc.greeting.queryOptions({ input: { name } }))`. */
export const orpc = createTanstackQueryUtils(client)
