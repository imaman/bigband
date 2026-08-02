import { fromJs } from './from-js.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFn = (...args: any[]) => any

export function isFunction(u: unknown): u is AnyFn {
  return typeof u === 'function'
}

export class ForeignFunction {
  constructor(private readonly that: unknown, private readonly f: AnyFn) {}

  call(args: unknown[]) {
    return fromJs(this.f.apply(this.that, args))
  }
}
