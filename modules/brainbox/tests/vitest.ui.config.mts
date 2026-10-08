import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// This file lives under tests/ (so that build-raptor fingerprints it), hence the package root is one level up.
const packageRoot = fileURLToPath(new URL('..', import.meta.url))

// Component tests of the UI: they render the React components in happy-dom (Node.js) and let them talk over HTTP to
// the worker, run by wrangler's test harness from the output of `vite build` (vite-dist/), as in the harness specs.
// Unlike every other test in the repo, they run from source (ui/**/*.ui-spec.tsx) rather than from dist/: the UI is
// type-checked by tsconfig-ui.json (it needs `DOM`, which conflicts with the Workers types of the tsc build) and is
// only ever compiled by Vite. build-raptor runs them as the test-ui build task, which depends on the build-ui task. To
// run them by hand: `yarn build && yarn build-ui && yarn test-ui`.
export default defineConfig({
  root: packageRoot,
  plugins: [react()],
  test: {
    name: 'ui',
    root: packageRoot,
    include: ['ui/**/*.ui-spec.tsx'],
    environment: 'happy-dom',
    provide: {
      // The config that `vite build` generates, i.e. the one `wrangler deploy` uses.
      wranglerConfigPath: path.join(packageRoot, 'vite-dist/brainbox/wrangler.json'),
    },
  },
})
