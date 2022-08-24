import { Runtime } from './runtime'
import { Scanner } from './scanner'

export function foo() {}

export function parse(s: string) {
  const p = new Scanner(s)
  const runtime = new Runtime(p)
  return runtime.evaluate().export()
}
