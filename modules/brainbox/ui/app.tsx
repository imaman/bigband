import { queryOptions, useQuery } from '@tanstack/react-query'
import { hc, parseResponse } from 'hono/client'

import type { AppType } from '../src/brainbox-service.js'
import { SessionAge } from './session-age.js'

const client = hc<AppType>('/')

const greetingQuery = (name: string) =>
  queryOptions({
    retry: false,
    queryKey: ['greeting', name],
    queryFn: async ({ signal }) => parseResponse(client.api.greeting.$get({ query: { name } }, { init: { signal } })),
  })

export function App() {
  const { isPending, error, data } = useQuery(greetingQuery(new URLSearchParams(location.search).get('yourName') ?? ''))
  return (
    <>
      <SessionAge />
      <h1 id="greeting">{isPending ? 'Loading... ⏳' : error ? error.message : `${data.greeting} (${data.count})`}</h1>
    </>
  )
}
