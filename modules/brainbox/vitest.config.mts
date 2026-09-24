import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
    }),
  ],
  test: {
    // build-raptor's test task runs the compiled tests, like every other module in the repo
    include: ['dist/tests/**/*.spec.js'],
  },
})
