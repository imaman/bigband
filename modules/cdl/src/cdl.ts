import { AstNode } from './ast-node'
import { Location2d, Span } from './location'
import { Parser } from './parser'
import { Runtime, Verbosity } from './runtime'
import { Scanner } from './scanner'
import { Value } from './value'

interface LocateResult {
  from: Location2d
  to: Location2d
}

type Result =
  | {
      tag: 'ok'
      value: unknown
    }
  | {
      tag: 'sink'
      where: () => LocateResult | undefined
      trace: () => string | undefined
      symbols: () => Record<string, unknown> | undefined
      errorMessage: () => string
    }

class ResultSink {
  readonly tag = 'sink'
  constructor(private readonly sink: Value, private readonly cdl: Cdl) {}

  where() {
    return this.cdl.locate(this.sink)
  }

  trace() {
    return this.cdl.trace(this.sink)
  }

  symbols() {
    return this.cdl.symbols(this.sink)
  }

  errorMessage() {
    const trace = this.trace()
    const at = trace ? trace : this.where
    return `Evaluated to sink: ${at}`
  }
}

export class Cdl {
  private readonly parser
  private readonly scanner

  constructor(readonly input: string) {
    this.scanner = new Scanner(this.input)
    this.parser = new Parser(this.scanner)
  }

  run(verbosity: Verbosity = 'quiet'): Result {
    const ast = parse(this.parser)
    const runtime = new Runtime(ast, verbosity, this.parser)
    const c = runtime.compute()

    if (c.value) {
      if (!c.value.isSink()) {
        return { value: c.value.export(), tag: 'ok' }
      }
      return new ResultSink(c.value, this)
    }

    const runtimeErrorMessage = `${c.errorMessage} when evaluating:\n${this.mapTrace(c.expressionTrace)}`
    throw new Error(runtimeErrorMessage)
  }

  private mapTrace(trace: AstNode[]) {
    const spacer = '  '

    const enriched = trace.map(curr => {
      const span = this.parser.span(curr)
      return {
        ast: curr,
        span,
        from: this.scanner.resolveLocation(span.from),
        to: this.scanner.resolveLocation(span.to),
      }
    })

    const formatted = enriched
      .map(curr => `at (${curr.from.line + 1}:${curr.from.col + 1}) ${this.interestingPart(curr)}`)
      .reverse()
      .join(`\n${spacer}`)
    return `${spacer}${formatted}`
  }

  private interestingPart(arg: { span: Span; from: Location2d; to: Location2d }) {
    if (arg.from.line === arg.to.line) {
      const line = this.scanner
        .lineAt(arg.span.from)
        .substring(arg.from.col, arg.to.col + 1)
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

  locate(v: Value): LocateResult | undefined {
    const span = v.span()
    if (span) {
      return { from: this.scanner.resolveLocation(span.from), to: this.scanner.resolveLocation(span.to) }
    }

    return undefined
  }

  trace(v: Value) {
    const trace = v.trace()
    if (trace) {
      return this.mapTrace(trace)
    }

    return undefined
  }

  symbols(v: Value) {
    return v.symbols()?.export()
  }
}

export function parse(arg: string | Parser) {
  const parser = typeof arg === 'string' ? new Parser(new Scanner(arg)) : arg
  const ast = parser.parse()
  return ast
}
