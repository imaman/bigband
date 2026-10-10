import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { DetachedWindowAPI } from 'happy-dom'
import { afterAll, afterEach, beforeAll, describe, expect, inject, it } from 'vitest'
import { createTestHarness } from 'wrangler'

import { App } from './app.js'

declare module 'vitest' {
  interface ProvidedContext {
    wranglerConfigPath: string
  }
}

const server = createTestHarness({
  workers: [{ configPath: inject('wranglerConfigPath'), secrets: { BRAINBOX_SERVICE_SECRET: '12345' } }],
})

// Points happy-dom's page at `pathAndQuery` on the harness's origin. The UI's relative requests (`hc('/')`) and its
// reads of `location` then resolve against the worker, same-origin, as they do in the deployed app. The origin is
// looked up on every call because the harness may move to another port when it is reset or updated.
async function navigate(pathAndQuery: string) {
  const happyDOM: unknown = Reflect.get(globalThis, 'happyDOM')
  if (!(happyDOM instanceof DetachedWindowAPI)) {
    throw new Error('Not running under happy-dom')
  }
  const { url } = await server.listen()
  happyDOM.setURL(new URL(pathAndQuery, url).href)
}

function renderApp() {
  // A fresh client per test, so that no query result is shared between tests.
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  )
}

// Component tests of the UI against the worker as deployed (see tests/vitest.ui.config.mts).
describe('app', () => {
  beforeAll(async () => {
    await server.listen()
  })

  afterEach(async () => {
    // Vitest runs without globals, so testing-library cannot register its own cleanup.
    cleanup()
    await server.reset()
  })

  afterAll(async () => {
    await server.close()
  })

  it('shows the greeting and the request count', async () => {
    await navigate('/?yourName=alice')
    renderApp()
    expect(await screen.findByText('Hello, alice! (1)')).toBeTruthy()
  })

  it('greets a stranger when no name is given', async () => {
    await navigate('/')
    renderApp()
    expect(await screen.findByText('Hello, stranger! (1)')).toBeTruthy()
  })

  it('shows the status when the backend call fails', async () => {
    await server.update(o => ({
      ...o,
      workers: o.workers.map(w =>
        'configPath' in w ? { ...w, vars: { ...(w.vars ?? {}), ALLOWANCE: { minute: 0, hour: 0, day: 0 } } } : w,
      ),
    }))
    await navigate('/?yourName=alice')
    renderApp()
    expect(await screen.findByText('Backend call came back with 429')).toBeTruthy()
  })
})
