import * as path from 'path'

import { Unit } from './ast-node'
import { failMe } from './fail-me'
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
  static run(input: string, options?: Options, args: Record<string, unknown> = {}): unknown {
    const onSink =
      options?.onSink ??
      ((r: ResultSink) => {
        throw new Error(r.message)
      })

    const fileName = '<inline>'
    const contentRec: Record<string, string> = { [fileName]: input }
    const readFile = (m: string) => contentRec[m]
    const res = new Septima().computeModule(fileName, args, readFile)
    if (res.tag === 'ok') {
      return res.value
    }

    if (res.tag === 'sink') {
      return onSink(res)
    }

    shouldNeverHappen(res)
  }

  private readonly unitByFileName = new Map<string, { unit: Unit; sourceCode: SourceCode }>()

  constructor(private readonly sourceRoot = '') {}

  computeModule(fileName: string, args: Record<string, unknown>, readFile: (m: string) => string): Result {
    this.loadSync(fileName, readFile)
    const value = this.computeImpl(fileName, 'quiet', {}, args)
    if (!value.isSink()) {
      return { value: value.export(), tag: 'ok' }
    }
    const { sourceCode } = this.unitByFileName.get(fileName) ?? failMe(`fileName not found: ${fileName}`)
    return new ResultSinkImpl(value, sourceCode)
  }

  async load(fileName: string, readFile: (m: string) => Promise<string>): Promise<void> {
    const visit = async (currFileName: string) => {
      const fromSourceRoot = path.relative(this.sourceRoot, currFileName)

      if (this.unitByFileName.has(fromSourceRoot)) {
        return
      }

      const content = await readFile(fromSourceRoot)
      const sourceCode = new SourceCode(content)
      const scanner = new Scanner(sourceCode)
      const parser = new Parser(scanner)
      const unit = parse(parser)

      this.unitByFileName.set(fromSourceRoot, { unit, sourceCode })

      for (const at of unit.imports) {
        const p = path.relative(fromSourceRoot, at.pathToImportFrom.text)
        await visit(p)
      }
    }

    await visit(fileName)
  }

  loadSync(fileName: string, readFile: (m: string) => string) {
    const currFileName = fileName
    const fromSourceRoot = path.relative(this.sourceRoot, currFileName)

    if (this.unitByFileName.has(fromSourceRoot)) {
      return
    }

    const content =
      readFile(fromSourceRoot) ??
      failMe(`content is undefined for ${currFileName} (fileName=${fileName}, fromSourceRoot=${fromSourceRoot}`)
    const sourceCode = new SourceCode(content)
    const scanner = new Scanner(sourceCode)
    const parser = new Parser(scanner)
    const unit = parse(parser)

    this.unitByFileName.set(fromSourceRoot, { unit, sourceCode })

    for (const at of unit.imports) {
      const a0 = fromSourceRoot
      const a1 = at.pathToImportFrom.text
      const a0a1 = path.join(path.dirname(a0), a1)
      const p = path.relative(this.sourceRoot, a0a1)
      this.loadSync(p, readFile)
    }
  }

  private computeImpl(
    fileName: string,
    verbosity: Verbosity,
    lib: Record<string, Value>,
    args: Record<string, unknown>,
  ) {
    const getAstOf = (fileName: string) => {
      const { unit } = this.unitByFileName.get(fileName) ?? failMe(`file has not been loaded (file name: ${fileName})`)
      return unit
    }

    const runtime = new Runtime(getAstOf(fileName), verbosity, lib, getAstOf, args)
    const c = runtime.compute()

    if (c.value) {
      return c.value
    }

    const { sourceCode } =
      this.unitByFileName.get(fileName) ?? failMe(`sourceCode object was not found (file name: ${fileName})`)
    const runtimeErrorMessage = `${c.errorMessage} when evaluating:\n${sourceCode.formatTrace(c.expressionTrace)}`
    throw new Error(runtimeErrorMessage)
  }

  private computeLoaded(mainFileName: string, verbosity: Verbosity, args: Record<string, unknown>) {
    const getAstOf = (fileName: string) => {
      const ret = this.unitByFileName.get(fileName)
      if (!ret) {
        throw new Error(`file has not been loaded: ${fileName}`)
      }
      return ret
    }

    const { unit, sourceCode } = getAstOf(mainFileName)

    const runtime = new Runtime(unit, verbosity, {}, fileName => getAstOf(fileName).unit, args)
    const c = runtime.compute()

    if (c.value) {
      return c.value
    }

    const runtimeErrorMessage = `${c.errorMessage} when evaluating:\n${sourceCode.formatTrace(c.expressionTrace)}`
    throw new Error(runtimeErrorMessage)
  }
}

/**
 * Parses the given input and returns an AST.
 * @param arg the source code to parse (string) or a Parser object (configured with the source code to parse).
 * @returns
 */
export function parse(arg: string | Parser): Unit {
  const parser = typeof arg === 'string' ? new Parser(new Scanner(new SourceCode(arg))) : arg
  const ast = parser.parse()
  return ast
}
