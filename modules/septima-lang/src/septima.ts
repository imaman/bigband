import { Parser } from './parser'
import { Result, ResultSink, ResultSinkImpl } from './result'
import { Runtime, Verbosity } from './runtime'
import { Scanner } from './scanner'
import { shouldNeverHappen } from './should-never-happen'
import { SourceCode } from './source-code'
import { Value } from './value'

interface Options {
  /**
   * A callback function to be invoked when the Septima program evaluated to `sink`. Allows the caller to determine
   * which value will be returned in that case. For instance, passing `() => undefined` will translate a `sink` value
   * to `undefined`. The default behavior is to throw an error.
   */
  onSink?: (res: ResultSink) => unknown
}

export class Septima {
  /**
   * Runs a Septima program and returns the value it evaluates to. If it evaluates to `sink`, returns the value computed
   * by `options.onSink()` - if present, or throws an error - otherwise.
   *
   * This method is the simplest way to evaluate a Septima program, and it fits many common use cases. One can also use
   * `.compute()` to get additional details about the execution.
   *
   * @param input the source code of the Septima program
   * @param options
   * @returns the value that `input` evaluates to
   */
  static run(input: string, options?: Options): unknown {
    const onSink =
      options?.onSink ??
      ((r: ResultSink) => {
        throw new Error(r.message)
      })
    const res = new Septima(input).compute()
    if (res.tag === 'ok') {
      return res.value
    }

    if (res.tag === 'sink') {
      return onSink(res)
    }

    shouldNeverHappen(res)
  }

  constructor(readonly input: string, private readonly preimports: Record<string, string> = {}) {}

  compute(verbosity: Verbosity = 'quiet'): Result {
    const lib: Record<string, Value> = {}
    for (const [importName, importCode] of Object.entries(this.preimports)) {
      const sourceCode = new SourceCode(importCode)
      const value = this.computeImpl(sourceCode, verbosity, {})
      // TODO(imaman): throw if value is sink?
      lib[importName] = value
    }

    const sourceCode = new SourceCode(this.input)
    const value = this.computeImpl(sourceCode, verbosity, lib)
    if (!value.isSink()) {
      return { value: value.export(), tag: 'ok' }
    }
    return new ResultSinkImpl(value, sourceCode)
  }

  private computeImpl(sourceCode: SourceCode, verbosity: Verbosity, lib: Record<string, Value>) {
    const scanner = new Scanner(sourceCode)
    const parser = new Parser(scanner)

    const ast = parse(parser)
    const runtime = new Runtime(ast, verbosity, lib)
    const c = runtime.compute()

    if (c.value) {
      return c.value
    }

    const runtimeErrorMessage = `${c.errorMessage} when evaluating:\n${sourceCode.formatTrace(c.expressionTrace)}`
    throw new Error(runtimeErrorMessage)
  }
}

export function parse(arg: string | Parser) {
  const parser = typeof arg === 'string' ? new Parser(new Scanner(new SourceCode(arg))) : arg
  const ast = parser.parse()
  return ast
}
