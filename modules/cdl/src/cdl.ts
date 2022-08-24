import { Runtime } from './runtime'
import { Scanner } from './scanner'

export function foo() {}

export function parse(s: string) {
  const runtime = new Runtime(new Scanner(s))
  return runtime.parse().export()
}
