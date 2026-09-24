import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// This file lives under tests/ (so that build-raptor fingerprints it), hence the package root is one level up.
// Anchor everything to it so the config works regardless of the directory vitest is launched from.
const packageRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  root: packageRoot,
  plugins: [
    cloudflareTest({
      wrangler: { configPath: fileURLToPath(new URL('../wrangler.jsonc', import.meta.url)) },
    }),
  ],
  test: {
    // build-raptor's test task runs the compiled tests, like every other module in the repo
    include: ['dist/tests/**/*.spec.js'],
  },
})
