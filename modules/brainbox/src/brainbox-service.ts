import crypto from 'node:crypto'

/**
 * Handles a single incoming request. Kept separate from the `fetch` export so request handling stays a plain
 * function.
 */
export async function handleRequest(request: Request, env: Env): Promise<Response> {
  const count = await env.BACKPLANE.getByName('requests').trafficTick()
  if (typeof count !== 'number') {
    const retryAfterSeconds = Math.ceil(count.retryAfterMillis / 1000)
    return new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } })
  }
  const url = new URL(request.url)

  if (url.pathname === '/api/greeting') {
    const name = url.searchParams.get('name')?.trim() || 'stranger'
    const greeting = `Hello, ${name}!`
    return Response.json({ greeting, count, blended: encrypt(env.BRAINBOX_SERVICE_SECRET, greeting) })
  }

  // Files under public/ are served by the asset router before the worker runs, so an unmatched path here is a
  // genuine miss.
  return new Response('Not found', { status: 404 })
}

const VERSION = 1
const SALT_LEN = 16
const IV_LEN = 12
const TAG_LEN = 16
const INFO = Buffer.from('symcrypt v1 aes-256-gcm')

function encrypt(secret: string, plaintext: string) {
  const salt = crypto.randomBytes(SALT_LEN)
  const iv = crypto.randomBytes(IV_LEN)
  const key = deriveKey(secret, salt)

  const header = Buffer.concat([Buffer.from([VERSION]), salt, iv])
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv, { authTagLength: TAG_LEN })
  cipher.setAAD(header)

  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return Buffer.concat([header, tag, ciphertext]).toString('hex')
}

function deriveKey(secret: string, salt: Buffer) {
  if (secret.length === 0) {
    throw new Error('Key must be a non-empty string ')
  }
  return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(secret, 'utf8'), salt, INFO, 32))
}
// `satisfies` (rather than a type annotation) checks the object against `ExportedHandler<Env>` while keeping the
// inferred type, so `fetch` stays required and tests can call `worker.fetch` directly.
export const brainboxService = {
  async fetch(request, env, _ctx) {
    return handleRequest(request, env)
  },
} satisfies ExportedHandler<Env>
