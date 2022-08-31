import { Parser } from './parser'
import { Runtime, Verbosity } from './runtime'
import { Scanner } from './scanner'

export function trace(s: string) {
  return run(s, 'trace')
}

export function run(s: string, verbosity: Verbosity = 'quiet') {
  const parser = new Parser(new Scanner(s))
  const ast = parser.parse()
  const runtime = new Runtime(ast, verbosity)
  return runtime.run().export()
}
