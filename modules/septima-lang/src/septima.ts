import * as path from 'path'

import { Unit, UnitId } from './ast-node'
import { failMe } from './fail-me'
import { Parser } from './parser'
import { formatTrace, Result, ResultSink } from './result'
import { Outputter, Runtime, Verbosity } from './runtime'
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
  /**
   * A custom output function that will receive the values that are passed to console.log() calls in the septima code.
   */
  consoleLog?: Outputter
}

export interface Executable {
  execute(args: Record<string, unknown>): Result
}

type SyncCodeReader = (resolvePath: string) => string | undefined
type CodeReader = (resolvePath: string) => Promise<string | undefined>

export interface SourceUnit {
  sourceCode: SourceCode
  unit: Unit
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
    const res = new Septima(undefined, options?.consoleLog).compileSync(fileName, readFile).execute(args)
    if (res.tag === 'ok') {
      return res.value
    }

    if (res.tag === 'sink') {
      return onSink(res)
    }

    shouldNeverHappen(res)
  }

  private readonly unitByUnitId = new Map<UnitId, SourceUnit>()

  constructor(private readonly sourceRoot = '', private readonly consoleLog?: Outputter) {}

  compileSync(fileName: string, readFile: SyncCodeReader) {
    fileName = this.relativize(fileName)
    const acc = [fileName]
    this.pumpSync(acc, readFile)
    return this.getExecutableFor(fileName)
  }

  async compile(fileName: string, readFile: CodeReader) {
    fileName = this.relativize(fileName)
    const acc = [fileName]
    await this.pump(acc, readFile)
    return this.getExecutableFor(fileName)
  }

  private relativize(fileName: string) {
    if (path.isAbsolute(fileName)) {
      return path.relative(this.sourceRoot, fileName)
    }

    return fileName
  }

  private getExecutableFor(fileName: string): Executable {
    // Verify that a unit for the main file exists
    this.unitOf(undefined, fileName)

    return {
      execute: (args: Record<string, unknown>) => {
        const value = this.execute(fileName, 'quiet', args)
        const ret: Result = { value: value.export(), tag: 'ok' }
        return ret
      },
    }
  }

  private execute(fileName: string, verbosity: Verbosity, args: Record<string, unknown>) {
    const runtime = new Runtime(
      this.unitOf(undefined, fileName),
      verbosity,
      (a, b) => this.unitOf(a, b),
      args,
      this.consoleLog,
    )
    const c = runtime.compute()

    if (c.value) {
      return c.value
    }

    const formatted = formatTrace(c.expressionTrace, this.unitByUnitId)
    throw new Error(`${c.errorMessage} when evaluating:\n${formatted}`)
  }

  /**
   * Translates the filename into a resolved path (to be read) if it has not been read yet. If it has been read,
   * returns undefined
   */
  private computeResolvedPathToRead(fileName: string) {
    const pathFromSourceRoot = this.getPathFromSourceRoot(undefined, fileName)
    if (this.unitByUnitId.has(pathFromSourceRoot)) {
      return undefined
    }
    return path.join(this.sourceRoot, pathFromSourceRoot)
  }

  private loadFileContent(resolvedPath: string | undefined, content: string | undefined, acc: string[]) {
    if (resolvedPath === undefined) {
      return
    }
    const pathFromSourceRoot = path.relative(this.sourceRoot, resolvedPath)
    if (content === undefined) {
      throw new Error(`Cannot find file '${path.join(this.sourceRoot, pathFromSourceRoot)}'`)
    }
    const sourceCode = new SourceCode(content, pathFromSourceRoot)
    const scanner = new Scanner(sourceCode)
    const parser = new Parser(scanner)
    const unit = parser.parse()

    this.unitByUnitId.set(pathFromSourceRoot, { unit, sourceCode })
    acc.push(...unit.imports.map(at => this.getPathFromSourceRoot(pathFromSourceRoot, at.pathToImportFrom.text)))
  }

  private unitOf(importerPathFromSourceRoot: string | undefined, relativePath: string) {
    const p = this.getPathFromSourceRoot(importerPathFromSourceRoot, relativePath)
    const { unit } =
      this.unitByUnitId.get(p) ?? failMe(`Encluntered a file which has not been loaded (file name: ${p})`)
    return unit
  }

  private getPathFromSourceRoot(startingPoint: string | undefined, relativePath: string) {
    if (path.isAbsolute(relativePath)) {
      throw new Error(`An absolute path is not allowed in import (got: ${relativePath})`)
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

  // loadSync() need to be kept in sync with load(), ditto pumpSync() w/ pump(). There is deep testing coverage for the
  // sync variant but only partial coverage for the async variant.
  // An extra effort was taken in order to reduce the duplication between the two variants. This attempt achieved its
  // goal (to some extent) but resulted in a somewhat unnatural code (like using an "acc" parameter to collect items,
  // instead of returning an array, having an external "pump" logic instead of a plain recursion). Perhaps a better
  // approach is to have a contract test and run it twice thus equally testing the two variants.

  private loadSync(fileName: string, readFile: SyncCodeReader, acc: string[]) {
    const p = this.computeResolvedPathToRead(fileName)
    const content = p && readFile(p)
    this.loadFileContent(p, content, acc)
  }

  private async load(fileName: string, readFile: CodeReader, acc: string[]): Promise<void> {
    const p = this.computeResolvedPathToRead(fileName)
    const content = p && (await readFile(p))
    this.loadFileContent(p, content, acc)
  }

  private pumpSync(acc: string[], readFile: SyncCodeReader) {
    while (true) {
      const curr = acc.pop()
      if (!curr) {
        return
      }

      this.loadSync(curr, readFile, acc)
    }
  }

  private async pump(acc: string[], readFile: CodeReader) {
    while (true) {
      const curr = acc.pop()
      if (!curr) {
        return
      }

      await this.load(curr, readFile, acc)
    }
  }
}
