import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { SessionAge } from './session-age.js'

const GreetingResponse = z.object({ greeting: z.string() })

export function App() {
  const name = new URLSearchParams(location.search).get('yourName') ?? ''
  const { isPending, error, data } = useQuery({
    retry: false,
    queryKey: ['greeting', name],
    queryFn: async () => {
      const r = await fetch(`/api/greeting?name=${encodeURIComponent(name)}`)
      if (!r.ok) {
        throw new Error(`Backend call came back with ${r.status}`)
      }
      return GreetingResponse.parse(await r.json())
    },
  })

  return (
    <>
      <SessionAge />
      <h1 id="greeting">
        {isPending ? 'Loading...' : error ? (error instanceof Error ? error.message : String(error)) : data.greeting}
      </h1>
    </>
  )
}
