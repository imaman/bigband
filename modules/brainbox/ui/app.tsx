import { useEffect, useState } from 'react'
import { z } from 'zod'

import { SessionAge } from './session-age.js'

const GreetingResponse = z.object({ greeting: z.string() })

export function App() {
  const [text, setText] = useState('Loading…')

  useEffect(() => {
    const name = new URLSearchParams(location.search).get('yourName') ?? ''
    // Aborts the request when the component unmounts (StrictMode mounts twice in development).
    const controller = new AbortController()

    fetch(`/api/greeting?name=${encodeURIComponent(name)}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setText(GreetingResponse.parse(data).greeting)
      })
      .catch(err => {
        if (!controller.signal.aborted) {
          setText(`Error: ${err instanceof Error ? err.message : String(err)}`)
        }
      })

    return () => controller.abort()
  }, [])

  return (
    <>
      <SessionAge />
      <h1 id="greeting">{text}</h1>
    </>
  )
}
