import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Where `vite build` (vite.config.ts) writes its output. Shared by the vitest configs of the tests that run against it
// (the harness specs and the UI component tests). This file lives under tests/, hence the package root is one level up.
const packageRoot = fileURLToPath(new URL('..', import.meta.url))

/**
 * The wrangler config that `vite build` generates, i.e. the one `wrangler deploy` uses: it runs the worker bundle that
 * Vite built and serves the built UI as static assets. See
 * https://developers.cloudflare.com/workers/testing/test-harness/configure/
 */
export const viteDistWranglerConfigPath = path.join(packageRoot, 'vite-dist/brainbox/wrangler.json')

// Both vitest configs `provide` the path above as `wranglerConfigPath`. This declaration types `inject()` for the
// specs under tests/; the UI specs are type-checked by tsconfig-ui.json, which does not see this file, so
// ui/app.ui-spec.tsx repeats it.
declare module 'vitest' {
  export interface ProvidedContext {
    wranglerConfigPath: string
  }
}
