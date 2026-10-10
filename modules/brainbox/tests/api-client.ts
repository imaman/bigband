import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { ContractRouterClient } from '@orpc/contract'

import type { contract } from '../src/api-contract.js'

/** A client of the worker's API that sends its requests (to `<origin>/api/...`) through `fetch`. */
export function createApiClient(
  origin: string,
  fetch: (request: Request) => Promise<Response>,
): ContractRouterClient<typeof contract> {
  return createORPCClient(new RPCLink({ url: `${origin}/api`, fetch: request => fetch(request) }))
}
