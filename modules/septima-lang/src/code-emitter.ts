import { AstNode, Lambda, Unit } from './ast-node.js'
import { failMe } from './fail-me.js'
import { Instruction } from './instruction.js'
import { shouldNeverHappen } from './should-never-happen.js'

interface CodeChunk {
  unitId: string
  instructions: Instruction[]
  asts: AstNode[] // The AST node of each instruction
}
export class CodeFile {
  readonly chunks: CodeChunk[] = []
  private currChunkId = 0

  activateChunk(chunkId: number) {
    if (chunkId < 0 || chunkId > this.chunks.length) {
      throw new Error(`chunkId is out of bounds: ${chunkId}`)
    }
    this.currChunkId = chunkId
  }

  createChunk(ast: AstNode) {
    const ret = this.chunks.length
    this.chunks.push({ unitId: ast.unitId, instructions: [], asts: [] })
    return ret
  }

  chunkIdByUnitId(unitId: string) {
    return this.chunks.findIndex(at => at.unitId === unitId) ?? failMe(`No chunkId found for unitId ${unitId}`)
  }

  private get currChunk() {
    return this.chunks.at(this.currChunkId) ?? failMe('no chunk')
  }

  add<T extends Instruction>(instruction: T, ast: AstNode): T {
    this.currChunk.instructions.push(instruction)
    this.currChunk.asts.push(ast)
    return instruction
  }

  get offset() {
    return this.currChunk.instructions.length
  }

  private getChunk(chunkId: number) {
    return this.chunks.at(chunkId) ?? failMe(`bad chunkId: ${chunkId}`)
  }

  get(chunkId: number) {
    return this.getChunk(chunkId).instructions
  }

  read({ chunkId, pc }: { chunkId: number; pc: number }, isLast: boolean) {
    const c = this.getChunk(chunkId)
    if (!isLast) {
      --pc
    }
    const instruction = c.instructions[pc]
    const ast = c.asts[pc]

    if (instruction === undefined || ast === undefined) {
      throw new Error(`programCounter is out of range: ${pc}`)
    }

    return { instruction, ast }
  }

  format(): string {
    return this.chunks
      .flatMap(
        (at, i) =>
          `// chunck ${i} ${at.unitId}\n` +
          at.instructions.map((c, i) => `${i < 10 ? ' ' : ''}[${i}] ${JSON.stringify(c)}`).join('\n'),
      )
      .join('\n\n')
  }
}

export class CodeEmitter {
  private workList: { ast: Lambda; chunkId: number }[] = []

  constructor(
    private readonly getAstOf: (unitId: string | undefined, relativePath: string) => Unit,
    private readonly reolveUnitId: (unitId: string | undefined, relativePath: string) => string,
  ) {}
  // const o = this.importDefinitions(ast.unitId, imp.pathToImportFrom.text)

  private registerLambda(ast: Lambda, cf: CodeFile) {
    const ret = cf.createChunk(ast)
    this.workList.push({ ast, chunkId: ret })
    return ret
  }

  private discoverUnits(unitId: string, cf: CodeFile) {
    const ast = this.getAstOf(undefined, unitId)

    const seen = new Set<string>([unitId])
    const units: Unit[] = [ast]
    let k = -1
    while (true) {
      ++k
      const u = units.at(k)
      if (!u) {
        break
      }

      for (const imp of u.imports) {
        const importee = this.getAstOf(u.unitId, imp.pathToImportFrom.text)
        if (!seen.has(importee.unitId)) {
          units.push(importee)
        }
        seen.add(importee.unitId)
      }
    }

    return units.map(u => ({ ast: u, chunkId: cf.createChunk(u) }))
  }

  run(unitId: string) {
    const cf = new CodeFile()
    const chunkedUnits = this.discoverUnits(unitId, cf)
    for (const { ast, chunkId } of chunkedUnits) {
      cf.activateChunk(chunkId)
      this.emit(ast, cf)

      let i = 0
      while (i < this.workList.length) {
        const at = this.workList[i]
        ++i
        cf.activateChunk(at.chunkId)
        for (let i = 0; i < at.ast.formalArgs.length; ++i) {
          cf.add({ tag: 'loadArg', param: i }, ast)
          cf.add({ tag: 'store', param: at.ast.formalArgs[i].ident.t.text }, ast)
        }
        this.emit(at.ast.body, cf)
      }
    }

    return cf
  }

  private emit(ast: AstNode, cf: CodeFile) {
    if (ast.tag === 'unit') {
      for (const imp of ast.imports) {
        const importeeUnitId = this.reolveUnitId(ast.unitId, imp.pathToImportFrom.text)
        const importeeChunkId = cf.chunkIdByUnitId(importeeUnitId)
        cf.add({ tag: 'import', chunkId: importeeChunkId }, ast)
        cf.add({ tag: 'store', param: imp.ident.t.text }, ast)
      }
      this.emit(ast.expression, cf)
    } else if (ast.tag === 'topLevelExpression') {
      const seen = new Set<string>()
      let hasExported = false
      for (const d of ast.definitions) {
        cf.add({ tag: 'reserve', name: d.ident.t.text, isExported: d.isExported }, ast)
        hasExported = hasExported || d.isExported
      }
      for (const d of ast.definitions) {
        const name = d.ident.t.text
        // TODO(imaman): should be handled at the parser level?
        if (seen.has(name)) {
          throw new Error(`duplicate definition: ${JSON.stringify(name)}`)
        }

        seen.add(name)
        this.emit(d, cf)
      }
      if (hasExported) {
        // TODO(imaman): this is a tiny security concern: he who writes the opcodes can tell the VM which definitions to
        // export (by controlling the n value). A better approach is to let the VM decide which values to export. For this
        // the VM needs to know when the current unit "started" (val-table wise).
        cf.add({ tag: 'export*', n: ast.definitions.length }, ast)
      }

      if (ast.computation) {
        this.emit(ast.computation, cf)
      }

      if (ast.definitions.length > 0) {
        // TODO(imaman): just like with export* maybe it's better to let the VM decide how much to unwind from the
        // val-table.
        cf.add({ tag: 'exitScope', param: ast.definitions.length }, ast)
      }

      if (ast.throwToken) {
        cf.add({ tag: 'throw' }, ast)
      }
    } else if (ast.tag === 'arrayLiteral') {
      const spreads: number[] = []
      for (let i = 0; i < ast.parts.length; ++i) {
        const part = ast.parts[i]
        if (part.tag === 'element') {
          this.emit(part.v, cf)
        } else if (part.tag === 'spread') {
          this.emit(part.v, cf)
          spreads.push(i)
        } else {
          shouldNeverHappen(part)
        }
      }
      cf.add({ tag: 'array', n: ast.parts.length, spreads }, ast)
    } else if (ast.tag === 'ident') {
      cf.add({ tag: 'load', param: ast.t.text }, ast)
    } else if (ast.tag === 'literal') {
      if (ast.type === 'bool' || ast.type === 'num') {
        cf.add({ tag: 'const', param: JSON.parse(ast.t.text) }, ast)
      } else if (ast.type === 'str') {
        cf.add({ tag: 'const', param: ast.t.text }, ast)
      } else if (ast.type === 'undef') {
        cf.add({ tag: 'constUndefined' }, ast)
      } else {
        shouldNeverHappen(ast.type)
      }
    } else if (ast.tag === 'binaryOperator') {
      const op = ast.operator
      if (op === '&&') {
        this.emit(ast.lhs, cf)
        const cond = cf.add({ tag: 'ifFalse', to: -1 }, ast)
        cf.add({ tag: 'drop' }, ast)
        this.emit(ast.rhs, cf)
        cf.add({ tag: 'assertType', param: 'boolean' }, ast)
        cond.to = cf.offset
      } else if (op === '||') {
        this.emit(ast.lhs, cf)
        const cond = cf.add({ tag: 'ifTrue', to: -1 }, ast)
        cf.add({ tag: 'drop' }, ast)
        this.emit(ast.rhs, cf)
        cf.add({ tag: 'assertType', param: 'boolean' }, ast)
        cond.to = cf.offset
      } else if (op === '??') {
        throw new Error(`not yet ${JSON.stringify(ast)}`)
      } else if (
        op === '!=' ||
        op === '%' ||
        op === '*' ||
        op === '**' ||
        op === '+' ||
        op === '-' ||
        op === '/' ||
        op === '<' ||
        op === '<=' ||
        op === '==' ||
        op === '>' ||
        op === '>='
      ) {
        this.emit(ast.lhs, cf)
        this.emit(ast.rhs, cf)
        cf.add({ tag: 'binop', mod: op }, ast)
      } else {
        shouldNeverHappen(op)
      }
    } else if (ast.tag === 'dot') {
      this.emit(ast.receiver, cf)
      cf.add({ tag: 'dot', param: ast.ident.t.text }, ast)
    } else if (ast.tag === 'export*') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'formalArg') {
      throw new Error(`not yet: ${ast.tag}`)
    } else if (ast.tag === 'functionCall') {
      for (const a of ast.actualArgs) {
        this.emit(a, cf)
      }
      this.emit(ast.callee, cf)
      cf.add({ tag: 'call', param: ast.actualArgs.length }, ast)
    } else if (ast.tag === 'if' || ast.tag === 'ternary') {
      this.emit(ast.condition, cf)
      const cond = cf.add({ tag: 'ifFalse', to: 0 }, ast)
      cf.add({ tag: 'drop' }, ast)
      this.emit(ast.positive, cf)
      const positiveEnd = cf.add({ tag: 'jump', to: 0 }, ast)
      cond.to = cf.offset
      cf.add({ tag: 'drop' }, ast)
      this.emit(ast.negative, cf)
      positiveEnd.to = cf.offset
    } else if (ast.tag === 'indexAccess') {
      this.emit(ast.receiver, cf)
      this.emit(ast.index, cf)
      cf.add({ tag: 'indexAccess' }, ast)
    } else if (ast.tag === 'lambda') {
      const id = this.registerLambda(ast, cf)
      cf.add({ tag: 'lambdaRef', id }, ast)
    } else if (ast.tag === 'let') {
      this.emit(ast.value, cf)
      cf.add({ tag: 'fillIn', name: ast.ident.t.text }, ast)
    } else if (ast.tag === 'objectLiteral') {
      const spreads: number[] = []
      for (let i = 0; i < ast.parts.length; ++i) {
        const part = ast.parts[i]
        if (part.tag === 'hardName' || part.tag === 'quotedString') {
          cf.add({ tag: 'const', param: part.k.t.text }, ast)
          this.emit(part.v, cf)
        } else if (part.tag === 'computedName') {
          this.emit(part.k, cf)
          this.emit(part.v, cf)
        } else if (part.tag === 'spread') {
          spreads.push(i)
          this.emit(part.o, cf)
        } else {
          shouldNeverHappen(part)
        }
      }
      cf.add({ tag: 'object', n: ast.parts.length, spreads }, ast)
    } else if (ast.tag === 'templateLiteral') {
      for (const part of ast.parts) {
        if (part.tag === 'string') {
          cf.add({ tag: 'const', param: part.value }, ast)
        } else if (part.tag === 'expression') {
          this.emit(part.expr, cf)
        } else {
          shouldNeverHappen(part)
        }
        cf.add({ tag: 'array', n: ast.parts.length, spreads: [] }, ast)
      }
    } else if (ast.tag === 'unaryOperator') {
      this.emit(ast.operand, cf)
      cf.add({ tag: 'unop', mod: ast.operator }, ast)
    } else {
      shouldNeverHappen(ast)
    }
  }
}
