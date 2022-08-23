import { Parser } from './parser'
import { Runtime } from './runtime'

export function foo() {}

export function parse(s: string) {
  const p = new Parser(s)
  const runtime = new Runtime(p)
  return runtime.evaluate().export()
}
