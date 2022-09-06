import { Location } from './location'
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
    const c = runtime.compute()

    const spacer = '  '

    if (c.value) {
      return c.value
    }

    const enriched = c.expressionTrace.map(curr => {
      const location = this.parser.locate(curr)
      return {
        ast: curr,
        location,
        resolvedLocation: this.scanner.resolveLocation(location),
      }
    })

    const mostRecent = enriched.find(Boolean)
    const lineCol = mostRecent?.resolvedLocation ?? { line: 0, col: 0 }

    const formatted = enriched
      .map(curr => `at (${curr.resolvedLocation.line}:${curr.resolvedLocation.col}) ${this.interestingPart(curr)}`)
      .reverse()
      .join(`\n${spacer}`)
    const error = new Error(
      `(Ln ${lineCol.line},Col ${lineCol.col}) ${c.errorMessage} when evaluating:\n${spacer}${formatted}`,
    )

    throw error
  }

  private interestingPart(arg: { location: Location }) {
    const ret = this.scanner.lineAt(arg.location)
    const limit = 80
    if (ret.length <= limit) {
      return ret
    }

    return `${ret.substring(0, limit)}...`
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
