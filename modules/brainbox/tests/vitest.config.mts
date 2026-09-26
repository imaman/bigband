import { cloudflareTest } from '@cloudflare/vitest-plugin'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

// This file lives under tests/ (so that build-raptor fingerprints it), hence the package root is one level up.
// Anchor everything to it so the config works regardless of the directory vitest is launched from.
const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const wranglerConfigPath = path.join(packageRoot, 'wrangler.jsonc')

// build-raptor's test task runs the compiled tests (dist/tests), like every other module in the repo.
const harnessSpecs = 'dist/tests/**/*.harness.spec.js'

export default defineConfig({
  root: packageRoot,
  test: {
    projects: [
      {
        // Tests that run inside workerd via the Workers vitest integration (`cloudflare:test`, `SELF`, `env`).
        plugins: [cloudflareTest({ wrangler: { configPath: wranglerConfigPath } })],
        test: {
          name: 'workerd',
          root: packageRoot,
          include: ['dist/tests/**/*.spec.js'],
          exclude: [...configDefaults.exclude, harnessSpecs],
        },
      },
      {
        // Tests that run in Node.js and drive the worker through wrangler's test harness (`createTestHarness`).
        test: {
          name: 'harness',
          root: packageRoot,
          include: [harnessSpecs],
          environment: 'node',
        },
      },
    ],
  },
})
