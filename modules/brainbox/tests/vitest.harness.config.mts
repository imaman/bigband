import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

import { viteDistWranglerConfigPath } from './vite-dist.mjs'

// This file lives under tests/ (so that build-raptor fingerprints it), hence the package root is one level up.
const packageRoot = fileURLToPath(new URL('..', import.meta.url))

// Tests that run in Node.js and drive the worker through wrangler's test harness (`createTestHarness`). They run
// against the output of `vite build` (vite-dist/), so build-raptor runs them as the test-harness build task, which
// depends on the build-ui task. To run them by hand: `yarn build-ui && yarn test-harness`.
export default defineConfig({
  root: packageRoot,
  test: {
    name: 'harness',
    root: packageRoot,
    include: ['dist/tests/**/*.harness.spec.js'],
    environment: 'node',
    provide: { wranglerConfigPath: viteDistWranglerConfigPath },
  },
})
