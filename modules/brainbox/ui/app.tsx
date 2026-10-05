import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { z } from 'zod'

import { SessionAge } from './session-age.js'

const GreetingResponse = z.object({ greeting: z.string() })

export function App() {
  const [text, setText] = useState('Loading…')

  const { mutate } = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      fetch(`/api/greeting?name=${encodeURIComponent(name)}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then(data => {
          setText(GreetingResponse.parse(data).greeting)
        })
        .catch(err => {
          // if (!controller.signal.aborted) {
          setText(`Error: ${err instanceof Error ? err.message : String(err)}`)
          // }
        })
    },
  })
  useEffect(() => {
    const name = new URLSearchParams(location.search).get('yourName') ?? ''
    mutate({ name })
  }, [mutate])

  return (
    <>
      <SessionAge />
      <h1 id="greeting">{text}</h1>
    </>
  )
}
