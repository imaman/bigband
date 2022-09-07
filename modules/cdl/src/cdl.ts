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
      where: LocateResult | undefined
      trace: string | undefined
      symbols: Record<string, unknown> | undefined
      errorMessage: () => string
    }

class ResultSink {
  readonly tag = 'sink'
  constructor(private readonly sink: Value, private readonly cdl: Cdl) {}

  get where() {
    return this.cdl.locate(this.sink)
  }

  get trace() {
    return this.cdl.trace(this.sink)
  }

  get symbols() {
    return this.cdl.symbols(this.sink)
  }

  errorMessage(): string {
    const trace = this.trace
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

    const runtimeErrorMessage = `${c.errorMessage} when evaluating:\n${this.formatTrace(c.expressionTrace)}`
    throw new Error(runtimeErrorMessage)
  }

  formatLocation(loc: Location2d) {
    return `(${loc.line + 1}:${loc.col + 1})`
  }

  formatTrace(trace: AstNode[]): string {
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
      .map(curr => `at ${this.formatLocation(curr.from)} ${this.interestingPart(curr.span)}`)
      .reverse()
      .join(`\n${spacer}`)
    return `${spacer}${formatted}`
  }

  private interestingPart(span: Span) {
    const f = this.scanner.resolveLocation(span.from)
    const t = this.scanner.resolveLocation(span.to)

    const formatLine = (s: string) => {
      const stripped = s.replace(/^[\n]*/, '').replace(/[\n]*$/, '')
      const limit = 80
      if (stripped.length <= limit) {
        return stripped
      }
      return `${stripped.substring(0, limit)}...`
    }

    const lineAtFrom = this.scanner.lineAt(span.from)
    if (f.line === t.line) {
      return formatLine(lineAtFrom.substring(f.col, t.col + 1))
    }
    return formatLine(lineAtFrom)
  }

  locate(v: Value): LocateResult | undefined {
    const span = v.span()
    if (span) {
      return { from: this.scanner.resolveLocation(span.from), to: this.scanner.resolveLocation(span.to) }
    }

    return undefined
  }

  trace(v: Value): string | undefined {
    const trace = v.trace()
    if (trace) {
      return this.formatTrace(trace)
    }

    return undefined
  }

  symbols(v: Value): Record<string, unknown> | undefined {
    return v.symbols()?.export()
  }
}

export function parse(arg: string | Parser) {
  const parser = typeof arg === 'string' ? new Parser(new Scanner(arg)) : arg
  const ast = parser.parse()
  return ast
}
