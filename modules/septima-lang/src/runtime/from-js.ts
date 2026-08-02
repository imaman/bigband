import util from 'util'

import { ForeignFunction } from './foreign-function.js'
import { SeptimaArray } from './septima-array.js'
import { SeptimaFunction } from './septima-function.js'
import { SeptimaObject } from './septima-object.js'

export function fromJs(u: unknown): unknown {
  if (u === null) {
    return undefined
  }
  const t = typeof u
  if (t === 'bigint' || t === 'boolean' || t === 'function' || t === 'number' || t === 'string' || t === 'undefined') {
    return u
  }

  if (t === 'symbol') {
    throw new Error(`cannot translate symbol: ${u}`)
  }

  if (
    u instanceof SeptimaArray ||
    u instanceof SeptimaObject ||
    u instanceof SeptimaFunction ||
    u instanceof ForeignFunction
  ) {
    return u
  }

  if (Array.isArray(u)) {
    return new SeptimaArray(
      u.map(at => fromJs(at)),
      [],
    )
  }

  if (typeof u === 'object') {
    return new SeptimaObject(Object.entries(u).map(([k, v]) => [k, fromJs(v)]))
  }

  throw new Error(`Non translatable fromJs: ${util.inspect(u)}`)
}
