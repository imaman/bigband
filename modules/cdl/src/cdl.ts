import { Location2d, Span } from './location'
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
      const span = this.parser.span(curr)
      return {
        ast: curr,
        span,
        from: this.scanner.resolveLocation(span.from),
        to: this.scanner.resolveLocation(span.to),
      }
    })

    const mostRecent = enriched.find(Boolean)
    const lineCol = mostRecent?.from ?? { line: -1, col: -1 }

    const formatted = enriched
      .map(curr => `at (${curr.from.line + 1}:${curr.from.col + 1}) ${this.interestingPart(curr)}`)
      .reverse()
      .join(`\n${spacer}`)
    const error = new Error(
      `(Ln ${lineCol.line + 1},Col ${lineCol.col + 1}) ${c.errorMessage} when evaluating:\n${spacer}${formatted}`,
    )

    throw error
  }

  private interestingPart(arg: { span: Span; from: Location2d; to: Location2d }) {
    if (arg.from.line === arg.to.line) {
      const line = this.scanner
        .lineAt(arg.span.from)
        .substring(arg.from.col, arg.to.col)
        .replace(/^[\n]*/, '')
        .replace(/[\n]*$/, '')

      const limit = 80
      if (line.length <= limit) {
        return line
      }

      return `${line.substring(0, limit)}...`
    }
    const line = this.scanner
      .lineAt(arg.span.from)
      .replace(/^[\n]*/, '')
      .replace(/[\n]*$/, '')
    const limit = 80
    if (line.length <= limit) {
      return line
    }

    return `${line.substring(0, limit)}...`
  }

  locate(v: Value) {
    const span = v.span()
    if (span) {
      return this.scanner.resolveLocation(span.from)
    }

    return undefined
  }
}

export function parse(arg: string | Parser) {
  const parser = typeof arg === 'string' ? new Parser(new Scanner(arg)) : arg
  const ast = parser.parse()
  return ast
}
