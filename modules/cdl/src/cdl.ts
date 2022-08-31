import { Parser } from './parser'
import { Runtime } from './runtime'
import { Scanner } from './scanner'

export function run(s: string) {
  const parser = new Parser(new Scanner(s))
  const ast = parser.parse()
  const runtime = new Runtime(ast)
  return runtime.run().export()
}
