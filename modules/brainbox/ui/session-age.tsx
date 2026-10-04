import { useEffect, useState } from 'react'
import { format } from 'timeago.js'

// The session starts when the page loads, i.e. when this module is first evaluated. A reload starts a new session.
const sessionStart = Date.now()

/** A "session started 3 minutes ago" label, pinned to the top right corner of the page. */
export function SessionAge() {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    // timeago.js counts in seconds during the first minute, so refresh every second.
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div id="session-age" style={{ position: 'fixed', top: 8, right: 12, fontSize: 14, color: '#666' }}>
      session started {format(sessionStart, 'en_US', { relativeDate: now })}
    </div>
  )
}
