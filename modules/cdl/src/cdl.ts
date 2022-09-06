import { Parser } from './parser'
import { Runtime, Verbosity } from './runtime'
import { Scanner } from './scanner'
import { Value } from './value'

export class Cdl {
  private readonly parser
  private readonly scanner

  constructor(readonly input: string) {
    this.scanner = new Scanner(this.input)
    this.parser = new Parser(this.scanner)
  }
  run(verbosity: Verbosity = 'quiet'): Value {
    const ast = parse(this.parser)
    const runtime = new Runtime(ast, verbosity, this.parser)
    return runtime.run()
  }

  locate(v: Value) {
    const loc = v.location()
    if (loc) {
      return this.scanner.resolveLocation(loc)
    }

    return undefined
  }
}

export function parse(arg: string | Parser) {
  const parser = typeof arg === 'string' ? new Parser(new Scanner(arg)) : arg
  const ast = parser.parse()
  return ast
}
