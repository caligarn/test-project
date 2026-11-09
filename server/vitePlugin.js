// Runs the API inside the Vite dev and preview servers, so `npm run dev`
// gives the full app (with mock images when FAL_KEY is not set).
import { loadEnv } from 'vite'

export function apiPlugin() {
  let handleApi
  async function middleware(req, res, next) {
    if (!req.url.startsWith('/api/')) return next()
    handleApi ||= (await import('./routes.js')).handleApi
    handleApi(req, res)
  }
  return {
    name: 'gen-arcade-api',
    config(_, { mode }) {
      // Server-only variables (FAL_KEY, SESSION_SECRET, ...) from .env.local
      const env = loadEnv(mode, process.cwd(), '')
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v
      }
    },
    configureServer(server) {
      server.middlewares.use(middleware)
      setTimeout(async () => {
        const cfg = (await import('./config.js')).getConfig()
        const store = (await import('./store.js')).getStore()
        server.config.logger.info(
          `  API: images ${cfg.mock ? 'MOCK (set FAL_KEY in .env.local for real images)' : 'fal.ai'}, store ${store.kind}`
        )
      }, 0)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
