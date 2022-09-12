import { Unit } from './ast-node'
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
    const res = new Septima().compute(input, {}, 'quiet', {})
    if (res.tag === 'ok') {
      return res.value
    }

    if (res.tag === 'sink') {
      return onSink(res)
    }

    shouldNeverHappen(res)
  }

  constructor() {}

  computeModule(moduleName: string, moduleReader: (m: string) => string, args: Record<string, unknown>): Result {
    const input = moduleReader(moduleName)
    const sourceCode = new SourceCode(input)
    const value = this.computeImpl(sourceCode, 'quiet', {}, moduleReader, args)
    if (!value.isSink()) {
      return { value: value.export(), tag: 'ok' }
    }
    return new ResultSinkImpl(value, sourceCode)
  }

  compute(
    input: string,
    preimports: Record<string, string> = {},
    verbosity: Verbosity = 'quiet',
    args: Record<string, unknown>,
  ): Result {
    const lib: Record<string, Value> = {}
    for (const [importName, importCode] of Object.entries(preimports)) {
      const sourceCode = new SourceCode(importCode)
      const value = this.computeImpl(sourceCode, verbosity, {}, undefined, {})
      if (value.isSink()) {
        // TODO(imaman): cover!
        const r = new ResultSinkImpl(value, sourceCode)
        throw new Error(`preimport (${importName}) evaluated to sink: ${r.message}`)
      }
      lib[importName] = value
    }

    const sourceCode = new SourceCode(input)
    const value = this.computeImpl(sourceCode, verbosity, lib, undefined, args)
    if (!value.isSink()) {
      return { value: value.export(), tag: 'ok' }
    }
    return new ResultSinkImpl(value, sourceCode)
  }

  private computeImpl(
    sourceCode: SourceCode,
    verbosity: Verbosity,
    lib: Record<string, Value>,
    moduleReader: undefined | ((m: string) => string),
    args: Record<string, unknown>,
  ) {
    const scanner = new Scanner(sourceCode)
    const parser = new Parser(scanner)
    const ast = parse(parser)

    const getAstOf = (fileName: string) => {
      if (!moduleReader) {
        throw new Error(`cannot read modules`)
      }
      return parse(moduleReader(fileName))
    }

    const runtime = new Runtime(ast, verbosity, lib, getAstOf, args)
    const c = runtime.compute()

    if (c.value) {
      return c.value
    }

    const runtimeErrorMessage = `${c.errorMessage} when evaluating:\n${sourceCode.formatTrace(c.expressionTrace)}`
    throw new Error(runtimeErrorMessage)
  }
}

export function parse(arg: string | Parser): Unit {
  const parser = typeof arg === 'string' ? new Parser(new Scanner(new SourceCode(arg))) : arg
  const ast = parser.parse()
  return ast
}
