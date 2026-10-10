import { queryOptions, useQuery } from '@tanstack/react-query'
import { DetailedError, hc, parseResponse } from 'hono/client'

import type { AppType } from '../src/brainbox-service.js'
import { SessionAge } from './session-age.js'

const client = hc<AppType>('/')

const greetingQuery = (name: string) =>
  queryOptions({
    retry: false,
    queryKey: ['greeting', name],
    queryFn: async ({ signal }) => parseResponse(client.api.greeting.$get({ query: { name } }, { init: { signal } })),
  })

// `parseResponse` names a failed call `${status} ${statusText}`, but `statusText` is empty over HTTP/2 and HTTP/3
// (they carry only the status code), so in production that would read "429 ". Build the message from the status
// code alone.
function describeError(error: Error) {
  return error instanceof DetailedError ? `Backend call came back with ${error.statusCode}` : error.message
}

export function App() {
  const { isPending, error, data } = useQuery(greetingQuery(new URLSearchParams(location.search).get('yourName') ?? ''))
  return (
    <>
      <SessionAge />
      <h1 id="greeting">
        {isPending ? 'Loading... ⏳' : error ? describeError(error) : `${data.greeting} (${data.count})`}
      </h1>
    </>
  )
}
