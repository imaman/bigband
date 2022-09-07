import { AstNode } from './ast-node'
import { Span } from './location'
import { Parser } from './parser'
import { Runtime, Verbosity } from './runtime'
import { Scanner } from './scanner'
import { Value } from './value'

type Result =
  | {
      tag: 'ok'
      value: unknown
    }
  | {
      tag: 'sink'
      where: Span | undefined
      trace: string | undefined
      symbols: Record<string, unknown> | undefined
      message: string
    }

class ResultSink {
  readonly tag = 'sink'
  constructor(private readonly sink: Value, private readonly cdl: Cdl) {}

  get where(): Span | undefined {
    return this.sink.span()
  }

  get trace() {
    return this.cdl.trace(this.sink)
  }

  get symbols() {
    return this.cdl.symbols(this.sink)
  }

  get message(): string {
    const at = this.trace ?? this.cdl.sourceRef(this.where)
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

  formatTrace(trace: AstNode[]): string {
    const spacer = '  '

    const formatted = trace
      .map(ast => this.sourceRef(this.parser.span(ast)))
      .reverse()
      .join(`\n${spacer}`)
    return `${spacer}${formatted}`
  }

  sourceRef(span: Span | undefined) {
    if (!span) {
      return `at <unknown location>`
    }
    return `at ${this.formatSpan(span)} ${this.interestingPart(span)}`
  }

  formatSpan(span: Span) {
    const f = this.scanner.resolveLocation(span.from)
    const t = this.scanner.resolveLocation(span.to)
    if (f.line === t.line) {
      return `(${f.line + 1}:${f.col + 1}..${t.col + 1})`
    }

    return `(${f.line + 1}:${f.col + 1}..${t.line + 1}:${t.col + 1})`
  }

  private interestingPart(span: Span) {
    const f = this.scanner.resolveLocation(span.from)
    const t = this.scanner.resolveLocation(span.to)

    const strip = (s: string) => s.replace(/^[\n]*/, '').replace(/[\n]*$/, '')
    const limit = 80

    const lineAtFrom = this.scanner.lineAt(span.from)
    if (f.line !== t.line) {
      return `${strip(lineAtFrom).substring(0, limit)}...`
    }

    const stripped = strip(lineAtFrom.substring(f.col, t.col + 1))
    if (stripped.length <= limit) {
      return stripped
    }
    return `${stripped.substring(0, limit)}...`
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
