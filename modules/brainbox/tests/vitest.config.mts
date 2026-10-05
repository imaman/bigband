import { cloudflareTest } from '@cloudflare/vitest-plugin'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

// This file lives under tests/ (so that build-raptor fingerprints it), hence the package root is one level up.
// Anchor everything to it so the config works regardless of the directory vitest is launched from.
const packageRoot = fileURLToPath(new URL('..', import.meta.url))
const wranglerConfigPath = path.join(packageRoot, 'wrangler.jsonc')

// Tests that run inside workerd via the Workers vitest integration (`cloudflare:test`, and `env`/`exports` from
// `cloudflare:workers`). build-raptor's test task runs the compiled tests (dist/tests), like every other module in the
// repo. The harness specs have their own config (vitest.harness.config.mts) and build task (test-harness), because
// they need the output of `vite build`.
export default defineConfig({
  root: packageRoot,
  plugins: [
    cloudflareTest({
      wrangler: { configPath: wranglerConfigPath },
      miniflare: {
        bindings: {
          BRAINBOX_SERVICE_SECRET: '54321',
        },
      },
    }),
  ],
  test: {
    name: 'workerd',
    root: packageRoot,
    include: ['dist/tests/**/*.spec.js'],
    exclude: [...configDefaults.exclude, 'dist/tests/**/*.harness.spec.js'],
  },
})
