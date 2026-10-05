import { queryOptions, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { SessionAge } from './session-age.js'

const GreetingResponse = z.object({ greeting: z.string() })

const greetingQuery = (name: string) =>
  queryOptions({
    retry: false,
    queryKey: ['greeting', name],
    queryFn: async ({ signal }) => {
      const r = await fetch(`/api/greeting?name=${encodeURIComponent(name)}`, { signal })
      if (!r.ok) {
        throw new Error(`Backend call came back with ${r.status}`)
      }
      return GreetingResponse.parse(await r.json())
    },
  })

export function App() {
  const { isPending, error, data } = useQuery(greetingQuery(new URLSearchParams(location.search).get('yourName') ?? ''))
  return (
    <>
      <SessionAge />
      <h1 id="greeting">{isPending ? 'Loading... ⏳' : error ? error.message : data.greeting}</h1>
    </>
  )
}
