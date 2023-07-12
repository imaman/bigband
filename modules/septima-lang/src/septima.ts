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

export interface Executable {
  execute(args: Record<string, unknown>): Result
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
    return this.compileSync(fileName, readFile).execute(args)
  }

  async load(fileName: string, readFile: (m: string) => Promise<string | undefined>): Promise<void> {
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

  private loadSync(fileName: string, readFile: (resolvedPath: string) => string | undefined, acc: string[]) {
    const pathFromSourceRoot = this.getPathFromSourceRoot(undefined, fileName)
    if (this.unitByFileName.has(pathFromSourceRoot)) {
      return
    }

    const content = readFile(path.join(this.sourceRoot, pathFromSourceRoot))

    const pathsToLoad = this.loadFileContent(pathFromSourceRoot, content)
    acc.push(...pathsToLoad)
  }

  async compile(fileName: string, readFile: (resolvedPath: string) => Promise<string | undefined>) {
    await this.load(fileName, readFile)
    return this.getExecutableFor(fileName)
  }

  compileSync(fileName: string, readFile: (resolvedPath: string) => string | undefined) {
    const acc = [fileName]
    this.pumpSync(acc, readFile)
    return this.getExecutableFor(fileName)
  }

  private pumpSync(acc: string[], readFile: (resolvedPath: string) => string | undefined) {
    while (true) {
      const curr = acc.pop()
      if (!curr) {
        return
      }

      this.loadSync(curr, readFile, acc)
    }
  }

  getExecutableFor(fileName: string): Executable {
    // Verify that a unit for the main file exists
    this.unitOf(undefined, fileName)

    return {
      execute: (args: Record<string, unknown>) => {
        const value = this.computeImpl(fileName, 'quiet', args)
        let ret: Result
        if (!value.isSink()) {
          ret = { value: value.export(), tag: 'ok' }
        } else {
          const { sourceCode } = this.unitByFileName.get(fileName) ?? failMe(`fileName not found: ${fileName}`)
          ret = new ResultSinkImpl(value, sourceCode)
        }
        return ret
      },
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

  private computeImpl(fileName: string, verbosity: Verbosity, args: Record<string, unknown>) {
    const runtime = new Runtime(this.unitOf(undefined, fileName), verbosity, (a, b) => this.unitOf(a, b), args)
    const c = runtime.compute()

    if (c.value) {
      return c.value
    }

    const { sourceCode } =
      this.unitByFileName.get(fileName) ?? failMe(`sourceCode object was not found (file name: ${fileName})`)
    const runtimeErrorMessage = `${c.errorMessage} when evaluating:\n${sourceCode.formatTrace(c.expressionTrace)}`
    throw new Error(runtimeErrorMessage)
  }

  private unitOf(importerPathFromSourceRoot: string | undefined, relativePath: string) {
    const p = this.getPathFromSourceRoot(importerPathFromSourceRoot, relativePath)
    const { unit } =
      this.unitByFileName.get(p) ?? failMe(`Encluntered a file which has not been loaded (file name: ${p})`)
    return unit
  }

  private getPathFromSourceRoot(startingPoint: string | undefined, relativePath: string) {
    if (path.isAbsolute(relativePath)) {
      throw new Error(`An absolute path is not allowed for referencing a septima source file (got: ${relativePath})`)
    }
    const joined = startingPoint === undefined ? relativePath : path.join(path.dirname(startingPoint), relativePath)
    const ret = path.normalize(joined)
    if (ret.startsWith('.')) {
      throw new Error(
        `resolved path (${path.join(this.sourceRoot, ret)}) is pointing outside of source root (${this.sourceRoot})`,
      )
    }
    return ret
  }
}
