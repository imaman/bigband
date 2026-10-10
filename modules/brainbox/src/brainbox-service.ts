import { implement, ORPCError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { experimental_RethrowHandlerPlugin } from '@orpc/server/plugins'
import crypto from 'node:crypto'

import { contract } from './api-contract.js'

interface Context {
  env: Env
  count: number
}

const os = implement(contract).$context<Context>()

const router = os.router({
  greeting: os.greeting.handler(({ input, context }) => {
    const name = input.name?.trim() || 'stranger'
    const greeting = `Hello, ${name}!`
    return { greeting, count: context.count, blended: encrypt(context.env.BRAINBOX_SERVICE_SECRET, greeting) }
  }),
})

// Errors that procedures raised and that are bugs rather than part of the API: anything but an `ORPCError`, or an
// `ORPCError` that is a server error (e.g. an output that fails the contract's schema).
const unexpectedErrors = new WeakSet<object>()

const handler = new RPCHandler(router, {
  clientInterceptors: [
    async ({ next }) => {
      try {
        return await next()
      } catch (e) {
        const error = typeof e === 'object' && e !== null ? e : new Error(String(e))
        if (!(error instanceof ORPCError) || error.status >= 500) {
          unexpectedErrors.add(error)
        }
        throw error
      }
    },
  ],
  // The handler turns every error into an error response, so the invocation would end normally and Cloudflare's
  // observability would not record it as an exception. Rethrow the unexpected ones so that they reach the runtime.
  plugins: [new experimental_RethrowHandlerPlugin({ filter: e => unexpectedErrors.has(e) })],
})

export default {
  async fetch(request, env) {
    const count = await env.BACKPLANE.getByName('requests').trafficTick()
    if (typeof count !== 'number') {
      const retryAfterSeconds = Math.ceil(count.retryAfterMillis / 1000)
      return new Response('Too many requests', { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } })
    }

    const { matched, response } = await handler.handle(request, { prefix: '/api', context: { env, count } })
    return matched ? response : new Response('Not found', { status: 404 })
  },
} satisfies ExportedHandler<Env>

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
