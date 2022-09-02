import { Parser } from './parser'
import { Runtime, Verbosity } from './runtime'
import { Scanner } from './scanner'

export function trace(s: string) {
  return run(s, 'trace')
}

export function run(s: string, verbosity: Verbosity = 'quiet') {
  const ast = parse(s)
  const runtime = new Runtime(ast, verbosity)
  return runtime.run().export()
}

export function parse(s: string) {
  const parser = new Parser(new Scanner(s))
  const ast = parser.parse()
  return ast
}
