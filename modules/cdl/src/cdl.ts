import { AstNode } from './ast-node'
import { Span } from './location'
import { Parser } from './parser'
import { Runtime, Verbosity } from './runtime'
import { Scanner } from './scanner'
import { shouldNeverHappen } from './should-never-happen'
import { Value } from './value'

type ResultSink = {
  tag: 'sink'
  where: Span | undefined
  trace: string | undefined
  symbols: Record<string, unknown> | undefined
  message: string
}

type Result =
  | {
      tag: 'ok'
      value: unknown
    }
  | ResultSink

class ResultSinkImpl {
  readonly tag = 'sink'
  constructor(private readonly sink: Value, private readonly sourceCode: SourceCode) {}

  get where(): Span | undefined {
    return this.sink.span()
  }

  get trace() {
    const trace = this.sink.trace()
    if (trace) {
      return this.sourceCode.formatTrace(trace)
    }

    return undefined
  }

  get symbols() {
    return this.sink.symbols()?.export()
  }

  get message(): string {
    const at = this.trace ?? this.sourceCode.sourceRef(this.where)
    return `Evaluated to sink: ${at}`
  }
}

interface Options {
  /**
   * A callback function to be invoked when the CDL program evaluated to `sink`. Allows the caller to determine which
   * value will be returned in that case. For instance, passing `() => undefined` will translate a `sink` value to
   * `undefined`. The default behavior is to throw an error.
   */
  onSink?: (res: ResultSink) => unknown
}

class SourceCode {
  constructor(private readonly scanner: Scanner, private readonly parser: Parser) {}

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
}

export class Cdl {
  private readonly parser
  private readonly scanner
  private readonly sourceCode

  /**
   * Runs a CDL program and returns the value it evaluates to. If it evaluates to `sink`, returns the value computed
   * by `options.onSink()` - if present, or throws an error - otherwise.
   *
   * This method is the simplest way to evaluate a CDL program. One can also use `.compute()` to get a higher degree
   * of details about the result.
   *
   * @param input the source code of the CDL program
   * @param options
   * @returns the value that `input` evaluates to
   */
  static run(input: string, options?: Options): unknown {
    const onSink =
      options?.onSink ??
      ((r: ResultSink) => {
        throw new Error(r.message)
      })
    const res = new Cdl(input).compute()
    if (res.tag === 'ok') {
      return res.value
    }

    if (res.tag === 'sink') {
      return onSink(res)
    }

    shouldNeverHappen(res)
  }

  constructor(readonly input: string) {
    this.scanner = new Scanner(this.input)
    this.parser = new Parser(this.scanner)
    this.sourceCode = new SourceCode(this.scanner, this.parser)
  }

  compute(verbosity: Verbosity = 'quiet'): Result {
    const ast = parse(this.parser)
    const runtime = new Runtime(ast, verbosity, this.parser)
    const c = runtime.compute()

    if (c.value) {
      if (!c.value.isSink()) {
        return { value: c.value.export(), tag: 'ok' }
      }
      return new ResultSinkImpl(c.value, this.sourceCode)
    }

    const runtimeErrorMessage = `${c.errorMessage} when evaluating:\n${this.sourceCode.formatTrace(c.expressionTrace)}`
    throw new Error(runtimeErrorMessage)
  }
}

export function parse(arg: string | Parser) {
  const parser = typeof arg === 'string' ? new Parser(new Scanner(arg)) : arg
  const ast = parser.parse()
  return ast
}
