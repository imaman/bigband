import { Parser } from './parser'
import { Result, ResultSink, ResultSinkImpl } from './result'
import { Runtime, Verbosity } from './runtime'
import { Scanner } from './scanner'
import { shouldNeverHappen } from './should-never-happen'
import { SourceCode } from './source-code'

interface Options {
  /**
   * A callback function to be invoked when the CDL program evaluated to `sink`. Allows the caller to determine which
   * value will be returned in that case. For instance, passing `() => undefined` will translate a `sink` value to
   * `undefined`. The default behavior is to throw an error.
   */
  onSink?: (res: ResultSink) => unknown
}

export class Cdl {
  private readonly scanner
  private readonly sourceCode
  private readonly parser

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
    this.sourceCode = new SourceCode(this.input)
    this.scanner = new Scanner(this.sourceCode)
    this.parser = new Parser(this.scanner)
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
  const parser = typeof arg === 'string' ? new Parser(new Scanner(new SourceCode(arg))) : arg
  const ast = parser.parse()
  return ast
}
