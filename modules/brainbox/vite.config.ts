import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// `vite dev` runs the UI (index.html, ui/) with HMR and the worker (src/index.ts, per wrangler.jsonc) inside workerd,
// on one server. `vite build` writes the UI bundle, the worker bundle and the generated deploy config (a wrangler.json
// that `wrangler deploy` picks up) to vite-dist/.
export default defineConfig({
  build: {
    // Not the Vite default (dist/): that is the tsc output that the tests run from. Also must not start with "dist",
    // because build-raptor treats an output path that is a string prefix of another as a collision.
    outDir: 'vite-dist',
  },
  plugins: [react(), cloudflare()],
})
