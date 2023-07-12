import * as path from 'path'

import { Unit } from './ast-node'
import { failMe } from './fail-me'
import { Parser } from './parser'
import { Result, ResultSink, ResultSinkImpl } from './result'
import { Runtime, Verbosity } from './runtime'
import { Scanner } from './scanner'
import { shouldNeverHappen } from './should-never-happen'
import { SourceCode } from './source-code'

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

  computeModule(fileName: string, args: Record<string, unknown>, readFile: (m: string) => string | undefined): Result {
    this.loadSync(fileName, readFile)
    const value = this.computeImpl(fileName, 'quiet', args)
    if (!value.isSink()) {
      return { value: value.export(), tag: 'ok' }
    }
    const { sourceCode } = this.unitByFileName.get(fileName) ?? failMe(`fileName not found: ${fileName}`)
    return new ResultSinkImpl(value, sourceCode)
  }

  async load(fileName: string, readFile: (m: string) => Promise<string>): Promise<void> {
    const pathFromSourceRoot = this.getPathFromSourceRoot(undefined, fileName)

    if (this.unitByFileName.has(pathFromSourceRoot)) {
      return
    }

    const content = await readFile(path.join(this.sourceRoot, pathFromSourceRoot))

    const pathsToLoad = this.loadFileContent(pathFromSourceRoot, content)
    for (const p of pathsToLoad) {
      await this.load(p, readFile)
    }
  }

  loadSync(fileName: string, readFile: (resolvedPath: string) => string | undefined) {
    const pathFromSourceRoot = this.getPathFromSourceRoot(undefined, fileName)
    if (this.unitByFileName.has(pathFromSourceRoot)) {
      return
    }

    const content = readFile(path.join(this.sourceRoot, pathFromSourceRoot))

    const pathsToLoad = this.loadFileContent(pathFromSourceRoot, content)
    for (const p of pathsToLoad) {
      this.loadSync(p, readFile)
    }
  }

  private loadFileContent(pathFromSourceRoot: string, content: string | undefined) {
    if (content === undefined) {
      throw new Error(`Cannot find file '${path.join(this.sourceRoot, pathFromSourceRoot)}'`)
    }
    const sourceCode = new SourceCode(content, pathFromSourceRoot)
    const scanner = new Scanner(sourceCode)
    const parser = new Parser(scanner)
    const unit = parser.parse()

    this.unitByFileName.set(pathFromSourceRoot, { unit, sourceCode })

    return unit.imports.map(at => this.getPathFromSourceRoot(pathFromSourceRoot, at.pathToImportFrom.text))
  }

  private getPathFromSourceRoot(startingPoint: string | undefined, relativePath: string) {
    const joined = startingPoint === undefined ? relativePath : path.join(path.dirname(startingPoint), relativePath)
    const ret = path.normalize(joined)
    if (ret.startsWith('.')) {
      throw new Error(
        `resolved path (${path.join(this.sourceRoot, ret)}) is pointing outside of source root (${this.sourceRoot})`,
      )
    }
    return ret
  }

  private computeImpl(fileName: string, verbosity: Verbosity, args: Record<string, unknown>) {
    const getAstOf = (importerPathFromSourceRoot: string | undefined, relativePath: string) => {
      const p = this.getPathFromSourceRoot(importerPathFromSourceRoot, relativePath)
      const { unit } =
        this.unitByFileName.get(p) ?? failMe(`Encluntered a file which has not been loaded (file name: ${p})`)
      return unit
    }

    const runtime = new Runtime(getAstOf(undefined, fileName), verbosity, getAstOf, args)
    const c = runtime.compute()

    if (c.value) {
      return c.value
    }

    const { sourceCode } =
      this.unitByFileName.get(fileName) ?? failMe(`sourceCode object was not found (file name: ${fileName})`)
    const runtimeErrorMessage = `${c.errorMessage} when evaluating:\n${sourceCode.formatTrace(c.expressionTrace)}`
    throw new Error(runtimeErrorMessage)
  }
}
