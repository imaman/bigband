import { useQuery } from '@tanstack/react-query'

import { orpc } from './api.js'
import { SessionAge } from './session-age.js'

export function App() {
  const name = new URLSearchParams(location.search).get('yourName') ?? ''
  const { isPending, error, data } = useQuery(orpc.greeting.queryOptions({ input: { name }, retry: false }))
  return (
    <>
      <SessionAge />
      <h1 id="greeting">{isPending ? 'Loading... ⏳' : error ? error.message : `${data.greeting} (${data.count})`}</h1>
    </>
  )
}
