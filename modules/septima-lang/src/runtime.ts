import crypto from 'node:crypto'

import { AstNode, show, Unit, UnitId } from './ast-node.js'
import { extractMessage } from './extract-message.js'
import { failMe } from './fail-me.js'
import { shouldNeverHappen } from './should-never-happen.js'
import { SymbolTable, Visibility } from './symbol-table.js'
import { Value } from './value.js'

interface Placeholder {
  destination: undefined | Value
}

class SymbolFrame implements SymbolTable {
  constructor(
    readonly symbol: string,
    readonly placeholder: Placeholder,
    private readonly earlier: SymbolTable,
    private readonly visibility: Visibility,
  ) {}

  lookup(sym: string): Value {
    if (this.symbol === sym) {
      const ret = this.placeholder.destination
      if (ret === undefined) {
        throw new Error(`Unresolved definition: ${this.symbol}`)
      }
      return ret
    }

    return this.earlier.lookup(sym)
  }

  export() {
    const ret = this.earlier.export()
    ret[this.symbol] = this.placeholder.destination?.export() ?? failMe(`Unbounded symbol: ${this.symbol}`)
    return ret
  }

  exportValue(): Record<string, Value> {
    const ret = this.earlier.exportValue()
    if (this.visibility === 'INTERNAL') {
      return ret
    }

    if (this.visibility === 'EXPORTED') {
      ret[this.symbol] = this.placeholder.destination ?? failMe(`Unbounded symbol: ${this.symbol}`)
      return ret
    }

    shouldNeverHappen(this.visibility)
  }
}

class EmptySymbolTable implements SymbolTable {
  lookup(sym: string): Value {
    throw new Error(`Symbol ${sym} was not found`)
  }

  export() {
    return {}
  }

  exportValue(): Record<string, Value> {
    return {}
  }
}

export type Verbosity = 'quiet' | 'trace'
export type Outputter = (u: unknown) => void

export class Runtime {
  // private stack: Stack.T = undefined
  private evalStack: EvalFrame
  constructor(
    private readonly root: AstNode,
    private readonly verbosity: Verbosity = 'quiet',
    private readonly getAstOf: (importerAsPathFromSourceRoot: string, relativePathFromImporter: string) => Unit,
    private readonly args: Record<string, unknown>,
    private readonly consoleLog?: Outputter,
  ) {
    this.evalStack = this.makeTerminalEvalFrame()
  }

  private output(v: Value) {
    const logger = this.consoleLog ?? console.log // eslint-disable-line no-console
    logger(JSON.stringify(v))
  }

  private makeTerminalEvalFrame(): EvalFrame {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const fakeAst = undefined as unknown as AstNode
    const temp = {
      ast: fakeAst,
      index: -1,
      prev: undefined,
      operands: [undefined],
      symbolTable: this.buildInitialSymbolTable(true),
    }
    const ret = temp as unknown as EvalFrame // eslint-disable-line @typescript-eslint/consistent-type-assertions
    ret.prev = ret
    return ret
  }

  private buildInitialSymbolTable(generateTheArgsObject: boolean) {
    const empty = new EmptySymbolTable()

    const keys = Value.foreign(o => o.keys())
    const entries = Value.foreign(o => o.entries())
    const fromEntries = Value.foreign(o => o.fromEntries())
    const isArray = Value.foreign(o => o.isArray())
    const log = Value.foreign(o => {
      this.output(o)
      return o
    })

    const parse = Value.foreign(o => JSON.parse(o.toString()))
    const hash224 = Value.foreign(o => crypto.createHash('sha224').update(JSON.stringify(o.unwrap())).digest('hex'))

    let lib = new SymbolFrame('Object', { destination: Value.obj({ keys, entries, fromEntries }) }, empty, 'INTERNAL')
    lib = new SymbolFrame('String', { destination: Value.foreign(o => Value.str(o.toString())) }, lib, 'INTERNAL')
    lib = new SymbolFrame('Boolean', { destination: Value.foreign(o => Value.bool(o.toBoolean())) }, lib, 'INTERNAL')
    lib = new SymbolFrame('Number', { destination: Value.foreign(o => Value.num(o.toNumber())) }, lib, 'INTERNAL')
    lib = new SymbolFrame('Array', { destination: Value.obj({ isArray }) }, lib, 'INTERNAL')
    lib = new SymbolFrame('console', { destination: Value.obj({ log }) }, lib, 'INTERNAL')
    lib = new SymbolFrame('JSON', { destination: Value.obj({ parse }) }, lib, 'INTERNAL')
    lib = new SymbolFrame('crypto', { destination: Value.obj({ hash224 }) }, lib, 'INTERNAL')

    if (generateTheArgsObject) {
      lib = new SymbolFrame('args', { destination: Value.from(this.args) }, lib, 'INTERNAL')
    }

    return lib
  }

  compute() {
    this.evalStack = this.makeTerminalEvalFrame()
    this.push(this.root, 0, this.evalStack.symbolTable)

    try {
      const value = this.evalNode()
      return { value }
    } catch (e) {
      const trace: AstNode[] = []
      for (let curr = this.evalStack; curr.prev != curr; curr = curr?.prev) {
        trace.push(curr.ast)
      }
      return {
        expressionTrace: trace,
        errorMessage: extractMessage(e),
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        stack: (e as { stack?: string[] }).stack,
      }
    }
  }

  private numOperandsOf(ast: AstNode): number {
    if (ast.tag === 'functionCall') {
      return 2
    } else if (ast.tag === 'arrayLiteral') {
      return ast.parts.length
    } else if (ast.tag === 'binaryOperator') {
      return 2
    } else if (ast.tag === 'dot') {
      return 2
    } else if (ast.tag === 'export*') {
      return 0
    } else if (ast.tag === 'formalArg') {
      return 1
    } else if (ast.tag === 'ident') {
      return 0
    } else if (ast.tag === 'if') {
      return 3
    } else if (ast.tag === 'indexAccess') {
      return 2
    } else if (ast.tag === 'lambda') {
      return 2
    } else if (ast.tag === 'literal') {
      return 0
    } else if (ast.tag === 'objectLiteral') {
      return ast.parts.length
    } else if (ast.tag === 'templateLiteral') {
      return ast.parts.length
    } else if (ast.tag === 'ternary') {
      return 3
    } else if (ast.tag === 'topLevelExpression') {
      return ast.definitions.length + 1
    } else if (ast.tag === 'unaryOperator') {
      return 1
    } else if (ast.tag === 'unit') {
      return 1
    } else if (ast.tag == 'let') {
      return 1
    }
    shouldNeverHappen(ast)
  }

  private push(ast: AstNode, index: number, symbolTable: SymbolTable): undefined {
    const operands = new Array<Value | undefined>(this.numOperandsOf(ast)).fill(undefined)
    this.evalStack = { ast, operands, prev: this.evalStack, symbolTable, index, n: 0 }
  }

  private evalNode(): Value {
    const stopAt = this.evalStack
    while (true) {
      const curr = this.evalStack
      // if (curr.prev === curr) {
      // }

      const operand = this.evalNodeImpl(curr)
      curr.n += 1
      if (operand) {
        curr.prev.operands[curr.index] = operand
        this.evalStack = curr.prev
      }

      if (this.evalStack === stopAt) {
        return stopAt.operands[0] ?? failMe('no value was returned from the computation')
      }
    }
  }

  private importDefinitions(
    importerAsPathFromSourceRoot: UnitId,
    index: number,
    relativePathFromImporter: string,
  ): undefined | Value {
    const importee = this.getAstOf(importerAsPathFromSourceRoot, relativePathFromImporter)
    const exp = importee.expression
    if (
      exp.tag === 'arrayLiteral' ||
      exp.tag === 'binaryOperator' ||
      exp.tag === 'dot' ||
      exp.tag === 'export*' ||
      exp.tag === 'functionCall' ||
      exp.tag === 'ident' ||
      exp.tag === 'formalArg' ||
      exp.tag === 'if' ||
      exp.tag === 'ternary' ||
      exp.tag === 'indexAccess' ||
      exp.tag === 'lambda' ||
      exp.tag === 'literal' ||
      exp.tag === 'objectLiteral' ||
      exp.tag === 'templateLiteral' ||
      exp.tag === 'unaryOperator' ||
      exp.tag === 'unit' ||
      exp.tag === 'let'
    ) {
      // TODO(imaman): throw an error on non-exporting unit?
      return undefined
      // return Value.obj({})
    }

    if (exp.tag === 'topLevelExpression') {
      // Construct a syntehtic unit which is similar to importedUnit but override its expression with an expression that
      // just returns the importee's definitions bundled in a single object (an export* expression), and evaluate it.
      // This is the trick that allows the importer to gain access to the importee's own stuff.
      const exporStarUnit: AstNode = {
        tag: 'unit',
        imports: importee.imports,
        unitId: importee.unitId,
        expression: {
          tag: 'topLevelExpression',
          definitions: exp.definitions,
          unitId: importee.unitId,
          computation: { tag: 'export*', unitId: importee.unitId },
        },
      }
      return this.push(exporStarUnit, index, this.buildInitialSymbolTable(false))
    }

    shouldNeverHappen(exp)
  }

  private evalNodeImpl(curr: EvalFrame): undefined | Value {
    const { ast, n, symbolTable: table } = curr
    if (ast.tag === 'unit') {
      if (n < ast.imports.length) {
        return this.importDefinitions(ast.unitId, n, ast.imports[n].pathToImportFrom.text)
      }

      let newTable = table
      for (let i = 0; i < ast.imports.length; ++i) {
        const imp = ast.imports[i]
        newTable = new SymbolFrame(imp.ident.t.text, { destination: curr.operands[i] }, newTable, 'INTERNAL')
      }
      if (n === ast.imports.length) {
        return this.push(ast.expression, n, table)
      }

      return curr.operands[ast.imports.length]
    }

    if (ast.tag === 'topLevelExpression') {
      if (n < ast.definitions.length) {
        const def = ast.definitions[n]
        return this.push(def, -1, table)
      }

      if (n === ast.definitions.length) {
        if (!ast.computation) {
          return Value.str('')
        }
        return this.push(ast.computation, 0, table)
      }

      const c = curr.operands[0]
      if (ast.throwToken) {
        throw new Error(JSON.stringify(c))
      }

      return c
    }

    if (ast.tag === 'let') {
      if (n === 0) {
        const name = ast.ident.t.text
        curr.placeholder = { destination: undefined }
        const newTable = new SymbolFrame(name, curr.placeholder, table, ast.isExported ? 'EXPORTED' : 'INTERNAL')
        curr.prev.symbolTable = newTable
        return this.push(ast.value, 0, newTable)
      }

      const ph = curr.placeholder
      if (!ph) {
        throw new Error(`no placeholder when evaluating ${JSON.stringify(curr.ast)}`)
      }

      ph.destination = curr.operands[0]
      return ph.destination
    }

    if (ast.tag === 'export*') {
      return Value.obj(table.exportValue())
    }

    if (ast.tag === 'binaryOperator') {
      if (n === 0) {
        return this.push(ast.lhs, 0, table)
      }

      const lhs = curr.operands[0]
      if (!lhs) {
        throw new Error(`lhs is undefined`)
      }

      if (n === 1) {
        const op = ast.operator
        if (
          op === '!=' ||
          op === '==' ||
          op === '<=' ||
          op === '<' ||
          op === '>=' ||
          op === '>' ||
          op === '%' ||
          op === '*' ||
          op === '**' ||
          op === '+' ||
          op === '-' ||
          op === '/'
        ) {
          return this.push(ast.rhs, 1, table)
        }

        if (op === '||') {
          if (lhs.isTrue()) {
            return lhs
          }
          return this.push(ast.rhs, 1, table)
        }

        if (op === '&&') {
          if (lhs.isFalse()) {
            return lhs
          }
          return this.push(ast.rhs, 1, table)
        }

        if (op === '??') {
          if (!lhs.isUndefined()) {
            return lhs
          }

          return this.push(ast.rhs, 1, table)
        }

        shouldNeverHappen(op)
      }

      const rhs = curr.operands[1]
      if (!rhs) {
        throw new Error(`rhs is undefined`)
      }

      if (ast.operator === '!=') {
        return lhs.equalsTo(rhs).not()
      }
      if (ast.operator === '==') {
        return lhs.equalsTo(rhs)
      }

      if (ast.operator === '<=') {
        const comp = lhs.order(rhs)
        return comp.isToZero('<=')
      }
      if (ast.operator === '<') {
        const comp = lhs.order(rhs)
        return comp.isToZero('<')
      }
      if (ast.operator === '>=') {
        const comp = lhs.order(rhs)
        return comp.isToZero('>=')
      }
      if (ast.operator === '>') {
        const comp = lhs.order(rhs)
        return comp.isToZero('>')
      }
      if (ast.operator === '%') {
        return lhs.modulo(rhs)
      }
      if (ast.operator === '*') {
        return lhs.times(rhs)
      }
      if (ast.operator === '**') {
        return lhs.power(rhs)
      }
      if (ast.operator === '+') {
        return lhs.plus(rhs)
      }
      if (ast.operator === '-') {
        return lhs.minus(rhs)
      }
      if (ast.operator === '/') {
        return lhs.over(rhs)
      }

      if (ast.operator === '??') {
        return lhs.coalesce(() => rhs)
      }

      if (ast.operator === '||') {
        return lhs.or(() => rhs)
      }
      if (ast.operator === '&&') {
        return lhs.and(() => rhs)
      }

      shouldNeverHappen(ast.operator)
    }

    if (ast.tag === 'unaryOperator') {
      const operand = curr.operands[0]
      if (operand === undefined) {
        return this.push(ast.operand, 0, table)
      }

      if (ast.operator === '!') {
        return operand.not()
      }
      if (ast.operator === '+') {
        // We intentionally do <0 + operand> instead of just <operand>. This is due to type-checking: the latter will
        // evaluate to the operand as-is, making expression such as `+true` dynamically valid (which is not the desired
        // behavior)
        return Value.num(0).plus(operand)
      }
      if (ast.operator === '-') {
        return operand.negate()
      }

      shouldNeverHappen(ast.operator)
    }

    if (ast.tag === 'ident') {
      return table.lookup(ast.t.text)
    }

    if (ast.tag === 'formalArg') {
      if (!ast.defaultValue) {
        // This error should not be reached. The call flow should evaluate a formalArg node only when if it has
        // a default value sud-node.
        throw new Error(`no default value for ${ast}`)
      }

      return n === 0 ? this.push(ast.defaultValue, 0, table) : curr.operands[0]
    }

    if (ast.tag === 'literal') {
      if (ast.type === 'bool') {
        // TODO(imaman): stricter checking of 'false'
        return Value.bool(ast.t.text === 'true' ? true : false)
      }
      if (ast.type === 'num') {
        return Value.num(Number(ast.t.text))
      }
      if (ast.type === 'str') {
        return Value.str(ast.t.text)
      }

      if (ast.type === 'undef') {
        return Value.undef()
      }
      shouldNeverHappen(ast.type)
    }

    if (ast.tag === 'templateLiteral') {
      if (n < ast.parts.length) {
        const part = ast.parts[n]
        if (part.tag === 'string') {
          curr.operands[n] = Value.str(part.value)
          return undefined
        } else {
          return this.push(part.expr, n, table)
        }
      }

      return Value.str(curr.operands.map(at => at?.toString()).join(''))
    }

    if (ast.tag === 'arrayLiteral') {
      if (n < ast.parts.length) {
        const p = ast.parts[n]
        return this.push(p.v, n, table)
      }

      const arr: Value[] = []
      for (let i = 0; i < ast.parts.length; ++i) {
        const p = ast.parts[i]
        const v = curr.operands[i] ?? failMe(`no operand at ${i}`)
        if (p.tag === 'element') {
          arr.push(v)
        } else if (p.tag === 'spread') {
          if (v.isUndefined()) {
            continue
          }
          arr.push(...v.assertArr())
        } else {
          shouldNeverHappen(p)
        }
      }
      return Value.arr(arr)
    }

    if (ast.tag === 'objectLiteral') {
      if (n < ast.parts.length * 2) {
        if (n % 2 === 0) {
          const at = ast.parts[n / 2]
          if (at.tag === 'hardName' || at.tag === 'quotedString' || at.tag === 'computedName') {
            return this.push(at.v, n, table)
          } else if (at.tag === 'spread') {
            return this.push(at.o, n, table)
          } else {
            shouldNeverHappen(at)
          }
        } else {
          const at = ast.parts[(n - 1) / 2]
          if (at.tag === 'hardName' || at.tag === 'quotedString' || at.tag === 'spread') {
            return undefined
          } else if (at.tag === 'computedName') {
            return this.push(at.k, n, table)
            // .assertStr()
            // return this.push(at.o, n, table)
          } else {
            shouldNeverHappen(at)
          }
        }
      }

      const entries: [string, Value][] = []
      for (let i = 0; i < ast.parts.length; ++i) {
        const at = ast.parts[i]
        const v = curr.operands[i * 2] ?? failMe(`no v in ${i * 2}`)
        if (at.tag === 'hardName' || at.tag === 'quotedString') {
          entries.push([at.k.t.text, v])
          continue
        }

        if (at.tag === 'computedName') {
          const k = curr.operands[i * 2 + 1] ?? failMe(`no v in ${i * 2 + 1}`)
          entries.push([k.assertStr(), v])
          continue
        }

        if (at.tag === 'spread') {
          if (!v.isUndefined()) {
            entries.push(...Object.entries(v.assertObj()))
          }
          continue
        }

        shouldNeverHappen(at)
      }

      // TODO(imaman): verify type of all keys (strings, maybe also numbers)
      return Value.obj(Object.fromEntries(entries.filter(([_, v]) => !v.isUndefined())))
    }

    if (ast.tag === 'lambda') {
      return Value.lambda(ast, table)
    }

    if (ast.tag === 'functionCall') {
      if (n < ast.actualArgs.length) {
        return this.push(ast.actualArgs[n], n, table)
      }

      if (n === ast.actualArgs.length) {
        return this.push(ast.callee, n, table)
      }

      if (n === ast.actualArgs.length + 1) {
        const argValues = curr.operands.slice(0, ast.actualArgs.length).flatMap(at => (at === undefined ? [] : [at]))
        if (argValues.length !== ast.actualArgs.length) {
          failMe(`one of actualArgs is unset`)
        }
        const callee = curr.operands[ast.actualArgs.length] ?? failMe(`callee is unset`)

        return this.call(callee, argValues, n)
      }

      return curr.operands[ast.actualArgs.length + 1]
    }

    if (ast.tag === 'if' || ast.tag === 'ternary') {
      if (n === 0) {
        return this.push(ast.condition, 0, table)
      }

      if (n === 1) {
        const cond = curr.operands[0] ?? failMe(`condition is not set`)
        if (cond.isTrue()) {
          return this.push(ast.positive, 1, table)
        } else if (cond.isFalse()) {
          return this.push(ast.negative, 1, table)
        } else {
          throw new Error(`cond is neither false not true`)
        }
      }

      return curr.operands[1] ?? failMe(`operands[1] is not set`)
    }

    if (ast.tag === 'dot') {
      if (n === 0) {
        return this.push(ast.receiver, 0, table)
      }

      const rec = curr.operands[0]
      if (rec === undefined || rec === null) {
        throw new Error(`Cannot access attribute .${ast.ident.t.text} of ${rec}`)
      }
      return rec.access(ast.ident.t.text, () => failMe('access caller'))
    }

    if (ast.tag === 'indexAccess') {
      if (n === 0) {
        return this.push(ast.receiver, 0, table)
      } else if (n === 1) {
        return this.push(ast.index, 1, table)
      }

      const rec = curr.operands[0] ?? failMe(`operands[0] is not set`)
      const index = curr.operands[1] ?? failMe(`operands[1] is not set`)
      return rec.access(index, () => failMe('access caller'))
    }

    shouldNeverHappen(ast)
  }

  call(callee: Value, actualValues: Value[], index: number) {
    if (callee.isForeign()) {
      const f = callee.assertForeign()
      return Value.from(f(...actualValues))
    }

    const lamb = callee.assertLambda()

    const formals = lamb.ast.formalArgs
    const body = lamb.ast.body
    const lambdaTable = lamb.table

    const requiredCount = formals.filter(f => !f.defaultValue).length
    if (actualValues.length < requiredCount) {
      throw new Error(`Expected at least ${requiredCount} argument(s) but got ${actualValues.length}`)
    }

    let newTable = lambdaTable
    for (let i = 0; i < formals.length; ++i) {
      const formal = formals[i]
      const actual = actualValues[i]
      if (actual === undefined) {
        throw new Error(`A value must be passed to formal argument: ${show(formal.ident)}`)
      }
      newTable = new SymbolFrame(formal.ident.t.text, { destination: actual }, newTable, 'INTERNAL')
    }
    return this.push(body, index, newTable)

    // // let newTable = lambdaTable
    // for (let i = 0; i < formals.length; ++i) {
    //   const formal = formals[i]
    //   let actual = actualValues.at(i)
    //   const useDefault = actual === undefined || (actual.isUndefined() && formal.defaultValue)

    //   if (useDefault && formal.defaultValue) {
    //     actual = this.evalNode(formal.defaultValue, lambdaTable)
    //   }

    //   if (actual === undefined) {
    //     throw new Error(`A value must be passed to formal argument: ${show(formal.ident)}`)
    //   }

    //   newTable = new SymbolFrame(formal.ident.t.text, { destination: actual }, newTable, 'INTERNAL')
    // }
    // return this.evalNode(body, newTable)
  }
}

interface EvalFrame {
  ast: AstNode
  prev: EvalFrame
  index: number
  operands: (undefined | Value)[]
  n: number
  symbolTable: SymbolTable
  placeholder?: Placeholder
}
