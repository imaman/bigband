import { AstNode, show, Unit, UnitId } from './ast-node'
import { extractMessage } from './extract-message'
import { failMe } from './fail-me'
import { shouldNeverHappen } from './should-never-happen'
import * as Stack from './stack'
import { switchOn } from './switch-on'
import { SymbolTable, Visibility } from './symbol-table'
import { Value } from './value'

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
  private stack: Stack.T = undefined
  constructor(
    private readonly root: AstNode,
    private readonly verbosity: Verbosity = 'quiet',
    private readonly getAstOf: (importerAsPathFromSourceRoot: string, relativePathFromImporter: string) => Unit,
    private readonly args: Record<string, unknown>,
    private readonly consoleLog?: Outputter,
  ) {}

  private output(v: Value) {
    const logger = this.consoleLog ?? console.log // eslint-disable-line no-console
    logger(JSON.stringify(v))
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

    let lib = new SymbolFrame('Object', { destination: Value.obj({ keys, entries, fromEntries }) }, empty, 'INTERNAL')
    lib = new SymbolFrame('String', { destination: Value.foreign(o => Value.str(o.toString())) }, lib, 'INTERNAL')
    lib = new SymbolFrame('Boolean', { destination: Value.foreign(o => Value.bool(o.toBoolean())) }, lib, 'INTERNAL')
    lib = new SymbolFrame('Number', { destination: Value.foreign(o => Value.num(o.toNumber())) }, lib, 'INTERNAL')
    lib = new SymbolFrame('Array', { destination: Value.obj({ isArray }) }, lib, 'INTERNAL')
    lib = new SymbolFrame('console', { destination: Value.obj({ log }) }, lib, 'INTERNAL')
    lib = new SymbolFrame('JSON', { destination: Value.obj({ parse }) }, lib, 'INTERNAL')

    if (generateTheArgsObject) {
      lib = new SymbolFrame('args', { destination: Value.from(this.args) }, lib, 'INTERNAL')
    }

    return lib
  }

  compute() {
    try {
      const value = this.evalNode(this.root, this.buildInitialSymbolTable(true))
      return { value }
    } catch (e) {
      const trace: AstNode[] = []
      for (let curr = this.stack; curr; curr = curr?.next) {
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

  private evalNode(ast: AstNode, table: SymbolTable): Value {
    this.stack = Stack.push(ast, this.stack)
    const ret = this.evalNodeImpl(ast, table)
    switchOn(this.verbosity, {
      quiet: () => {},
      trace: () => {
        // eslint-disable-next-line no-console
        console.log(`output of <|${show(ast)}|> is ${JSON.stringify(ret)}  // ${ast.tag}`)
      },
    })
    this.stack = Stack.pop(this.stack)
    return ret
  }

  private importDefinitions(importerAsPathFromSourceRoot: UnitId, relativePathFromImporter: string): Value {
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
      exp.tag === 'unaryOperator' ||
      exp.tag === 'unit'
    ) {
      // TODO(imaman): throw an error on non-exporting unit?
      return Value.obj({})
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
      return this.evalNode(exporStarUnit, this.buildInitialSymbolTable(false))
    }

    shouldNeverHappen(exp)
  }

  private evalNodeImpl(ast: AstNode, table: SymbolTable): Value {
    if (ast.tag === 'unit') {
      let newTable = table
      for (const imp of ast.imports) {
        const o = this.importDefinitions(ast.unitId, imp.pathToImportFrom.text)
        newTable = new SymbolFrame(imp.ident.t.text, { destination: o }, newTable, 'INTERNAL')
      }
      return this.evalNode(ast.expression, newTable)
    }
    if (ast.tag === 'topLevelExpression') {
      let newTable = table
      for (const def of ast.definitions) {
        const name = def.ident.t.text
        const placeholder: Placeholder = { destination: undefined }
        newTable = new SymbolFrame(name, placeholder, newTable, def.isExported ? 'EXPORTED' : 'INTERNAL')
        const v = this.evalNode(def.value, newTable)
        placeholder.destination = v
      }

      if (ast.computation) {
        return this.evalNode(ast.computation, newTable)
      }

      return Value.str('')
    }

    if (ast.tag === 'export*') {
      return Value.obj(table.exportValue())
    }

    if (ast.tag === 'binaryOperator') {
      const lhs = this.evalNode(ast.lhs, table)
      if (ast.operator === '||') {
        return lhs.or(() => this.evalNode(ast.rhs, table))
      }
      if (ast.operator === '&&') {
        return lhs.and(() => this.evalNode(ast.rhs, table))
      }

      const rhs = this.evalNode(ast.rhs, table)
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
        return lhs.coalesce(() => this.evalNode(ast.rhs, table))
      }

      shouldNeverHappen(ast.operator)
    }

    if (ast.tag === 'unaryOperator') {
      const operand = this.evalNode(ast.operand, table)
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
      if (ast.defaultValue) {
        return this.evalNode(ast.defaultValue, table)
      }

      // This error should not be reached. The call flow should evaluate a formalArg node only when if it has
      // a default value.
      throw new Error(`no default value for ${ast}`)
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

    if (ast.tag === 'arrayLiteral') {
      const arr: Value[] = []
      for (const curr of ast.parts) {
        if (curr.tag === 'element') {
          arr.push(this.evalNode(curr.v, table))
        } else if (curr.tag === 'spread') {
          const v = this.evalNode(curr.v, table)
          if (v.isUndefined()) {
            continue
          }
          arr.push(...v.assertArr())
        } else {
          shouldNeverHappen(curr)
        }
      }

      return Value.arr(arr)
    }

    if (ast.tag === 'objectLiteral') {
      const entries: [string, Value][] = ast.parts.flatMap(at => {
        if (at.tag === 'hardName') {
          return [[at.k.t.text, this.evalNode(at.v, table)]]
        }
        if (at.tag === 'quotedString') {
          return [[at.k.t.text, this.evalNode(at.v, table)]]
        }
        if (at.tag === 'computedName') {
          return [[this.evalNode(at.k, table).assertStr(), this.evalNode(at.v, table)]]
        }
        if (at.tag === 'spread') {
          const o = this.evalNode(at.o, table)
          if (o.isUndefined()) {
            return []
          }
          return Object.entries(o.assertObj())
        }

        shouldNeverHappen(at)
      })

      // TODO(imaman): verify type of all keys (strings, maybe also numbers)
      return Value.obj(Object.fromEntries(entries.filter(([_, v]) => !v.isUndefined())))
    }

    if (ast.tag === 'lambda') {
      return Value.lambda(ast, table)
    }

    if (ast.tag === 'functionCall') {
      const argValues = ast.actualArgs.map(a => this.evalNode(a, table))
      const callee = this.evalNode(ast.callee, table)

      return this.call(callee, argValues)
    }

    if (ast.tag === 'if' || ast.tag === 'ternary') {
      const c = this.evalNode(ast.condition, table)
      return c.ifElse(
        () => this.evalNode(ast.positive, table),
        () => this.evalNode(ast.negative, table),
      )
    }

    if (ast.tag === 'dot') {
      const rec = this.evalNode(ast.receiver, table)
      if (rec === undefined || rec === null) {
        throw new Error(`Cannot access attribute .${ast.ident.t.text} of ${rec}`)
      }
      return rec.access(ast.ident.t.text, (callee, args) => this.call(callee, args))
    }

    if (ast.tag === 'indexAccess') {
      const rec = this.evalNode(ast.receiver, table)
      const index = this.evalNode(ast.index, table)
      return rec.access(index, (callee, args) => this.call(callee, args))
    }

    shouldNeverHappen(ast)
  }

  call(callee: Value, actualValues: Value[]) {
    return callee.call(actualValues, (formals, body, lambdaTable: SymbolTable) => {
      let newTable = lambdaTable
      for (let i = 0; i < formals.length; ++i) {
        const formal = formals[i]
        let actual = actualValues.at(i)
        const useDefault = actual === undefined || (actual.isUndefined() && formal.defaultValue)

        if (useDefault && formal.defaultValue) {
          actual = this.evalNode(formal.defaultValue, lambdaTable)
        }

        if (actual === undefined) {
          throw new Error(`A value must be passed to formal argument: ${show(formal.ident)}`)
        }

        newTable = new SymbolFrame(formal.ident.t.text, { destination: actual }, newTable, 'INTERNAL')
      }
      return this.evalNode(body, newTable)
    })
  }
}
