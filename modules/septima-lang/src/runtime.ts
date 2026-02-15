import crypto from 'crypto'

import { ArrayLiteralPart, AstNode, ObjectLiteralPart, show, TemplatePart, Unit, UnitId } from './ast-node'
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

type Cont = (value: Value) => void

type EvalTask = { type: 'eval'; ast: AstNode; table: SymbolTable; cont: Cont }
type ContTask = { type: 'cont'; cont: Cont; value: Value }
type CallTask = { type: 'call'; callee: Value; args: Value[]; cont: Cont }
type Task = EvalTask | ContTask | CallTask

type FunctionCallAst = Extract<AstNode, { tag: 'functionCall' }>
type TopLevelAst = Extract<AstNode, { tag: 'topLevelExpression' }>

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

  private runLoop(initial: Task) {
    const tasks: Task[] = [initial]

    const pushEval = (ast: AstNode, table: SymbolTable, cont: Cont) => {
      tasks.push({ type: 'eval', ast, table, cont })
    }
    const pushCont = (cont: Cont, value: Value) => {
      tasks.push({ type: 'cont', cont, value })
    }
    const pushCall = (callee: Value, args: Value[], cont: Cont) => {
      tasks.push({ type: 'call', callee, args, cont })
    }

    const scheduleArrayLiteral = (parts: ArrayLiteralPart[], table: SymbolTable, cont: Cont) => {
      const acc: Value[] = []
      const scheduleAt = (index: number) => {
        if (index >= parts.length) {
          pushCont(cont, Value.arr(acc))
          return
        }

        const part = parts[index]
        if (part.tag === 'element') {
          const afterElement: Cont = value => {
            acc.push(value)
            scheduleAt(index + 1)
          }
          pushEval(part.v, table, afterElement)
          return
        }
        if (part.tag === 'spread') {
          const afterSpread: Cont = value => {
            if (!value.isUndefined()) {
              acc.push(...value.assertArr())
            }
            scheduleAt(index + 1)
          }
          pushEval(part.v, table, afterSpread)
          return
        }

        shouldNeverHappen(part)
      }

      scheduleAt(0)
    }

    const scheduleObjectLiteral = (parts: ObjectLiteralPart[], table: SymbolTable, cont: Cont) => {
      const entries: [string, Value][] = []
      const scheduleAt = (index: number) => {
        if (index >= parts.length) {
          const filtered = entries.filter(([_, v]) => !v.isUndefined())
          pushCont(cont, Value.obj(Object.fromEntries(filtered)))
          return
        }

        const part = parts[index]
        if (part.tag === 'hardName') {
          const key = part.k.t.text
          const afterValue: Cont = value => {
            entries.push([key, value])
            scheduleAt(index + 1)
          }
          pushEval(part.v, table, afterValue)
          return
        }
        if (part.tag === 'quotedString') {
          const key = part.k.t.text
          const afterValue: Cont = value => {
            entries.push([key, value])
            scheduleAt(index + 1)
          }
          pushEval(part.v, table, afterValue)
          return
        }
        if (part.tag === 'computedName') {
          const afterKey: Cont = keyValue => {
            const key = keyValue.assertStr()
            const afterValue: Cont = value => {
              entries.push([key, value])
              scheduleAt(index + 1)
            }
            pushEval(part.v, table, afterValue)
          }
          pushEval(part.k, table, afterKey)
          return
        }
        if (part.tag === 'spread') {
          const afterSpread: Cont = value => {
            if (!value.isUndefined()) {
              entries.push(...Object.entries(value.assertObj()))
            }
            scheduleAt(index + 1)
          }
          pushEval(part.o, table, afterSpread)
          return
        }

        shouldNeverHappen(part)
      }

      scheduleAt(0)
    }

    const scheduleTemplateLiteral = (parts: TemplatePart[], table: SymbolTable, cont: Cont) => {
      let result = ''
      const scheduleAt = (startIndex: number) => {
        for (let index = startIndex; index < parts.length; index += 1) {
          const part = parts[index]
          if (part.tag === 'string') {
            result += part.value
            continue
          }

          const afterExpr: Cont = value => {
            result += value.toString()
            scheduleAt(index + 1)
          }
          pushEval(part.expr, table, afterExpr)
          return
        }

        pushCont(cont, Value.str(result))
      }

      scheduleAt(0)
    }

    const scheduleFunctionCall = (ast: FunctionCallAst, table: SymbolTable, cont: Cont) => {
      const args: Value[] = []
      const evalArg = (index: number) => {
        if (index >= ast.actualArgs.length) {
          const afterCallee: Cont = callee => {
            pushCall(callee, args, cont)
          }
          pushEval(ast.callee, table, afterCallee)
          return
        }

        const afterArg: Cont = value => {
          args.push(value)
          evalArg(index + 1)
        }
        pushEval(ast.actualArgs[index], table, afterArg)
      }

      evalArg(0)
    }

    const scheduleTopLevel = (ast: TopLevelAst, table: SymbolTable, cont: Cont) => {
      const defs = ast.definitions
      const processDef = (index: number, currentTable: SymbolTable) => {
        if (index >= defs.length) {
          if (!ast.computation) {
            pushCont(cont, Value.str(''))
            return
          }
          const afterComp: Cont = value => {
            if (ast.throwToken) {
              throw new Error(JSON.stringify(value))
            }
            pushCont(cont, value)
          }
          pushEval(ast.computation, currentTable, afterComp)
          return
        }

        const def = defs[index]
        const name = def.ident.t.text
        const placeholder: Placeholder = { destination: undefined }
        const newTable = new SymbolFrame(name, placeholder, currentTable, def.isExported ? 'EXPORTED' : 'INTERNAL')
        const afterDef: Cont = value => {
          placeholder.destination = value
          processDef(index + 1, newTable)
        }
        pushEval(def.value, newTable, afterDef)
      }

      processDef(0, table)
    }

    while (tasks.length > 0) {
      const task = tasks.pop()
      if (!task) {
        continue
      }
      if (task.type === 'cont') {
        task.cont(task.value)
        continue
      }
      if (task.type === 'call') {
        const { callee, args, cont } = task
        if (!callee.isLambda()) {
          const result = callee.call(args, () => failMe<Value>())
          pushCont(cont, result)
          continue
        }

        const { ast: lambda, table: lambdaTable } = callee.assertLambda()
        const formals = lambda.formalArgs
        const requiredCount = formals.filter(f => !f.defaultValue).length
        if (args.length < requiredCount) {
          throw new Error(`Expected at least ${requiredCount} argument(s) but got ${args.length}`)
        }

        const bindFormal = (index: number, newTable: SymbolTable) => {
          if (index >= formals.length) {
            pushEval(lambda.body, newTable, cont)
            return
          }

          const formal = formals[index]
          const actual = args.at(index)
          const useDefault =
            actual === undefined || (actual !== undefined && actual.isUndefined() && formal.defaultValue !== undefined)

          if (useDefault && formal.defaultValue) {
            const afterDefault: Cont = value => {
              const tableWithArg = new SymbolFrame(formal.ident.t.text, { destination: value }, newTable, 'INTERNAL')
              bindFormal(index + 1, tableWithArg)
            }
            pushEval(formal.defaultValue, lambdaTable, afterDefault)
            return
          }

          if (actual === undefined) {
            throw new Error(`A value must be passed to formal argument: ${show(formal.ident)}`)
          }

          const tableWithArg = new SymbolFrame(formal.ident.t.text, { destination: actual }, newTable, 'INTERNAL')
          bindFormal(index + 1, tableWithArg)
        }

        bindFormal(0, lambdaTable)
        continue
      }

      const ast = task.ast
      const table = task.table
      const outerCont = task.cont

      this.stack = Stack.push(ast, this.stack)
      const wrappedCont: Cont = value => {
        switchOn(this.verbosity, {
          quiet: () => {},
          trace: () => {
            // eslint-disable-next-line no-console
            console.log(`output of <|${show(ast)}|> is ${JSON.stringify(value)}  // ${ast.tag}`)
          },
        })
        this.stack = Stack.pop(this.stack)
        pushCont(outerCont, value)
      }

      if (ast.tag === 'unit') {
        let newTable = table
        for (const imp of ast.imports) {
          const o = this.importDefinitions(ast.unitId, imp.pathToImportFrom.text)
          newTable = new SymbolFrame(imp.ident.t.text, { destination: o }, newTable, 'INTERNAL')
        }
        pushEval(ast.expression, newTable, wrappedCont)
        continue
      }
      if (ast.tag === 'topLevelExpression') {
        scheduleTopLevel(ast, table, wrappedCont)
        continue
      }
      if (ast.tag === 'export*') {
        pushCont(wrappedCont, Value.obj(table.exportValue()))
        continue
      }
      if (ast.tag === 'binaryOperator') {
        const operator = ast.operator
        if (operator === '||') {
          const afterLhs: Cont = lhs => {
            const lhsBool = lhs.assertBool()
            if (lhsBool) {
              pushCont(wrappedCont, Value.bool(true))
              return
            }
            const afterRhs: Cont = rhs => {
              const rhsBool = rhs.assertBool()
              pushCont(wrappedCont, Value.bool(rhsBool))
            }
            pushEval(ast.rhs, table, afterRhs)
          }
          pushEval(ast.lhs, table, afterLhs)
          continue
        }
        if (operator === '&&') {
          const afterLhs: Cont = lhs => {
            const lhsBool = lhs.assertBool()
            if (!lhsBool) {
              pushCont(wrappedCont, Value.bool(false))
              return
            }
            const afterRhs: Cont = rhs => {
              const rhsBool = rhs.assertBool()
              pushCont(wrappedCont, Value.bool(rhsBool))
            }
            pushEval(ast.rhs, table, afterRhs)
          }
          pushEval(ast.lhs, table, afterLhs)
          continue
        }
        if (operator === '??') {
          const afterLhs: Cont = lhs => {
            if (!lhs.isUndefined()) {
              pushCont(wrappedCont, lhs)
              return
            }
            pushEval(ast.rhs, table, wrappedCont)
          }
          pushEval(ast.lhs, table, afterLhs)
          continue
        }

        const afterLhs: Cont = lhs => {
          const afterRhs: Cont = rhs => {
            if (operator === '!=') {
              pushCont(wrappedCont, lhs.equalsTo(rhs).not())
              return
            }
            if (operator === '==') {
              pushCont(wrappedCont, lhs.equalsTo(rhs))
              return
            }
            if (operator === '<=') {
              const comp = lhs.order(rhs)
              pushCont(wrappedCont, comp.isToZero('<='))
              return
            }
            if (operator === '<') {
              const comp = lhs.order(rhs)
              pushCont(wrappedCont, comp.isToZero('<'))
              return
            }
            if (operator === '>=') {
              const comp = lhs.order(rhs)
              pushCont(wrappedCont, comp.isToZero('>='))
              return
            }
            if (operator === '>') {
              const comp = lhs.order(rhs)
              pushCont(wrappedCont, comp.isToZero('>'))
              return
            }
            if (operator === '%') {
              pushCont(wrappedCont, lhs.modulo(rhs))
              return
            }
            if (operator === '*') {
              pushCont(wrappedCont, lhs.times(rhs))
              return
            }
            if (operator === '**') {
              pushCont(wrappedCont, lhs.power(rhs))
              return
            }
            if (operator === '+') {
              pushCont(wrappedCont, lhs.plus(rhs))
              return
            }
            if (operator === '-') {
              pushCont(wrappedCont, lhs.minus(rhs))
              return
            }
            if (operator === '/') {
              pushCont(wrappedCont, lhs.over(rhs))
              return
            }

            shouldNeverHappen(operator)
          }
          pushEval(ast.rhs, table, afterRhs)
        }
        pushEval(ast.lhs, table, afterLhs)
        continue
      }
      if (ast.tag === 'unaryOperator') {
        const afterOperand: Cont = operand => {
          if (ast.operator === '!') {
            pushCont(wrappedCont, operand.not())
            return
          }
          if (ast.operator === '+') {
            pushCont(wrappedCont, Value.num(0).plus(operand))
            return
          }
          if (ast.operator === '-') {
            pushCont(wrappedCont, operand.negate())
            return
          }

          shouldNeverHappen(ast.operator)
        }
        pushEval(ast.operand, table, afterOperand)
        continue
      }
      if (ast.tag === 'ident') {
        pushCont(wrappedCont, table.lookup(ast.t.text))
        continue
      }
      if (ast.tag === 'formalArg') {
        if (ast.defaultValue) {
          pushEval(ast.defaultValue, table, wrappedCont)
          continue
        }

        throw new Error(`no default value for ${ast}`)
      }
      if (ast.tag === 'literal') {
        if (ast.type === 'bool') {
          pushCont(wrappedCont, Value.bool(ast.t.text === 'true' ? true : false))
          continue
        }
        if (ast.type === 'num') {
          pushCont(wrappedCont, Value.num(Number(ast.t.text)))
          continue
        }
        if (ast.type === 'str') {
          pushCont(wrappedCont, Value.str(ast.t.text))
          continue
        }
        if (ast.type === 'undef') {
          pushCont(wrappedCont, Value.undef())
          continue
        }
        shouldNeverHappen(ast.type)
      }
      if (ast.tag === 'templateLiteral') {
        scheduleTemplateLiteral(ast.parts, table, wrappedCont)
        continue
      }
      if (ast.tag === 'arrayLiteral') {
        scheduleArrayLiteral(ast.parts, table, wrappedCont)
        continue
      }
      if (ast.tag === 'objectLiteral') {
        scheduleObjectLiteral(ast.parts, table, wrappedCont)
        continue
      }
      if (ast.tag === 'lambda') {
        pushCont(wrappedCont, Value.lambda(ast, table))
        continue
      }
      if (ast.tag === 'functionCall') {
        scheduleFunctionCall(ast, table, wrappedCont)
        continue
      }
      if (ast.tag === 'if' || ast.tag === 'ternary') {
        const afterCond: Cont = condition => {
          const condBool = condition.assertBool()
          if (condBool) {
            pushEval(ast.positive, table, wrappedCont)
            return
          }
          pushEval(ast.negative, table, wrappedCont)
        }
        pushEval(ast.condition, table, afterCond)
        continue
      }
      if (ast.tag === 'dot') {
        const afterReceiver: Cont = rec => {
          if (rec === undefined || rec === null) {
            throw new Error(`Cannot access attribute .${ast.ident.t.text} of ${rec}`)
          }
          const result = rec.access(ast.ident.t.text, (callee, args) => this.call(callee, args))
          pushCont(wrappedCont, result)
        }
        pushEval(ast.receiver, table, afterReceiver)
        continue
      }
      if (ast.tag === 'indexAccess') {
        const afterReceiver: Cont = rec => {
          const afterIndex: Cont = index => {
            const result = rec.access(index, (callee, args) => this.call(callee, args))
            pushCont(wrappedCont, result)
          }
          pushEval(ast.index, table, afterIndex)
        }
        pushEval(ast.receiver, table, afterReceiver)
        continue
      }

      shouldNeverHappen(ast)
    }
  }

  private evalNode(ast: AstNode, table: SymbolTable): Value {
    let result: Value | undefined
    this.runLoop({
      type: 'eval',
      ast,
      table,
      cont: value => {
        result = value
      },
    })
    if (result === undefined) {
      throw new Error(`Evaluation did not produce a value`)
    }
    return result
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
      exp.tag === 'templateLiteral' ||
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

  call(callee: Value, actualValues: Value[]) {
    let result: Value | undefined
    this.runLoop({
      type: 'call',
      callee,
      args: actualValues,
      cont: value => {
        result = value
      },
    })
    if (result === undefined) {
      throw new Error(`Call did not produce a value`)
    }
    return result
  }
}
