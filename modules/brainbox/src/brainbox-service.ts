import { env } from 'cloudflare:workers'
import { Hono } from 'hono'
import crypto from 'node:crypto'

export const app = new Hono<{ Bindings: typeof env }>()

app.get('/api/greeting', async c => {
  const count = await c.env.BACKPLANE.getByName('requests').trafficTick()
  if (typeof count !== 'number') {
    const retryAfterSeconds = Math.ceil(count.retryAfterMillis / 1000)
    return new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } })
  }
  const name = c.req.query('name')?.trim() || 'stranger'
  const greeting = `Hello, ${name}!`
  return c.json({ greeting, count, blended: encrypt(env.BRAINBOX_SERVICE_SECRET, greeting) })
})

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
