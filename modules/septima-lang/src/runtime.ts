import crypto from 'crypto'

import { AstNode, FormalArg, show, Unit, UnitId } from './ast-node'
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

interface ExecFrame {
  ast: AstNode
  table: SymbolTable
  outer: ExecFrame | undefined
  slotName: string | undefined
  slots: Partial<Record<string, Value>>
  state?: ExecFrameState
}

type StepResult = [Value, undefined] | [undefined, ExecFrame]
type UnitFrameState = { tag: 'unit'; table: SymbolTable }
type TopLevelFrameState = {
  tag: 'topLevelExpression'
  table: SymbolTable
  nextDefinitionIndex: number
  pending?: { slotName: string; placeholder: Placeholder; table: SymbolTable }
}
type LambdaCallFrameState = {
  tag: 'lambda-call'
  formals: FormalArg[]
  body: AstNode
  lambdaTable: SymbolTable
  newTable: SymbolTable
  actualValues: Value[]
  nextFormalIndex: number
}
type ExecFrameState = UnitFrameState | TopLevelFrameState | LambdaCallFrameState

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

  private evalNode(ast: AstNode, table: SymbolTable): Value {
    return this.evalLoop(ast, table)
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

  private mkFrame(ast: AstNode, table: SymbolTable, outer: ExecFrame, slotName: string): StepResult {
    return [undefined, { ast, table, outer, slotName, slots: {} }]
  }

  private done(value: Value): StepResult {
    return [value, undefined]
  }

  private readSlot(frame: ExecFrame, slotName: string): Value {
    const v = frame.slots[slotName]
    if (v === undefined) {
      return failMe<Value>(`missing slot: ${slotName}`)
    }
    return v
  }

  private frameOutput(ast: AstNode, ret: Value) {
    switchOn(this.verbosity, {
      quiet: () => {},
      trace: () => {
        // eslint-disable-next-line no-console
        console.log(`output of <|${show(ast)}|> is ${JSON.stringify(ret)}  // ${ast.tag}`)
      },
    })
  }

  private evalLoop(ast: AstNode, table: SymbolTable): Value {
    let end: ExecFrame = { ast, table, outer: undefined, slotName: undefined, slots: {} }
    this.stack = Stack.push(ast, this.stack)

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const [value, next] = this.step(end)
      if (next) {
        end = next
        this.stack = Stack.push(next.ast, this.stack)
        continue
      }

      const computed = value ?? failMe<Value>(`Evaluation step did not produce a value for ${show(end.ast)}`)
      this.frameOutput(end.ast, computed)
      this.stack = Stack.pop(this.stack)
      if (!end.outer) {
        return computed
      }

      end.outer.slots[end.slotName ?? failMe(`missing slot name for ${show(end.ast)}`)] = computed
      end = end.outer
    }
  }

  private step(frame: ExecFrame): StepResult {
    const { ast, table } = frame

    if (ast.tag === 'unit') {
      let state = frame.state
      if (!state) {
        let importedTable = table
        for (const imp of ast.imports) {
          const o = this.importDefinitions(ast.unitId, imp.pathToImportFrom.text)
          importedTable = new SymbolFrame(imp.ident.t.text, { destination: o }, importedTable, 'INTERNAL')
        }
        state = { tag: 'unit', table: importedTable }
        frame.state = state
      }
      if (state.tag !== 'unit') {
        return failMe<StepResult>(`Invalid state for unit frame`)
      }

      const slotName = 'expression'
      const cached = frame.slots[slotName]
      if (cached === undefined) {
        return this.mkFrame(ast.expression, state.table, frame, slotName)
      }
      return this.done(cached)
    }

    if (ast.tag === 'topLevelExpression') {
      let state = frame.state
      if (!state) {
        state = { tag: 'topLevelExpression', table, nextDefinitionIndex: 0 }
        frame.state = state
      }
      if (state.tag !== 'topLevelExpression') {
        return failMe<StepResult>(`Invalid state for topLevelExpression frame`)
      }

      while (state.nextDefinitionIndex < ast.definitions.length) {
        if (!state.pending) {
          const def = ast.definitions[state.nextDefinitionIndex]
          const placeholder: Placeholder = { destination: undefined }
          const tableForDefinition = new SymbolFrame(
            def.ident.t.text,
            placeholder,
            state.table,
            def.isExported ? 'EXPORTED' : 'INTERNAL',
          )
          state.pending = {
            slotName: `definition:${state.nextDefinitionIndex}`,
            placeholder,
            table: tableForDefinition,
          }
        }

        const pending = state.pending
        const v = frame.slots[pending.slotName]
        if (v === undefined) {
          const def = ast.definitions[state.nextDefinitionIndex]
          return this.mkFrame(def.value, pending.table, frame, pending.slotName)
        }

        pending.placeholder.destination = v
        state.table = pending.table
        state.pending = undefined
        state.nextDefinitionIndex += 1
      }

      if (!ast.computation) {
        return this.done(Value.str(''))
      }

      const slotName = 'computation'
      const c = frame.slots[slotName]
      if (c === undefined) {
        return this.mkFrame(ast.computation, state.table, frame, slotName)
      }
      if (ast.throwToken) {
        throw new Error(JSON.stringify(c))
      }
      return this.done(c)
    }

    if (ast.tag === 'export*') {
      return this.done(Value.obj(table.exportValue()))
    }

    if (ast.tag === 'binaryOperator') {
      const lhsSlot = 'lhs'
      const lhs = frame.slots[lhsSlot]
      if (lhs === undefined) {
        return this.mkFrame(ast.lhs, table, frame, lhsSlot)
      }

      if (ast.operator === '||') {
        if (lhs.assertBool()) {
          return this.done(Value.bool(true))
        }
        const rhsSlot = 'rhs'
        const rhs = frame.slots[rhsSlot]
        if (rhs === undefined) {
          return this.mkFrame(ast.rhs, table, frame, rhsSlot)
        }
        return this.done(Value.bool(rhs.assertBool()))
      }

      if (ast.operator === '&&') {
        if (!lhs.assertBool()) {
          return this.done(Value.bool(false))
        }
        const rhsSlot = 'rhs'
        const rhs = frame.slots[rhsSlot]
        if (rhs === undefined) {
          return this.mkFrame(ast.rhs, table, frame, rhsSlot)
        }
        return this.done(Value.bool(rhs.assertBool()))
      }

      if (ast.operator === '??') {
        if (!lhs.isUndefined()) {
          return this.done(lhs)
        }
        const rhsSlot = 'rhs'
        const rhs = frame.slots[rhsSlot]
        if (rhs === undefined) {
          return this.mkFrame(ast.rhs, table, frame, rhsSlot)
        }
        return this.done(rhs)
      }

      const rhsSlot = 'rhs'
      const rhs = frame.slots[rhsSlot]
      if (rhs === undefined) {
        return this.mkFrame(ast.rhs, table, frame, rhsSlot)
      }

      if (ast.operator === '!=') {
        return this.done(lhs.equalsTo(rhs).not())
      }
      if (ast.operator === '==') {
        return this.done(lhs.equalsTo(rhs))
      }
      if (ast.operator === '<=') {
        return this.done(lhs.order(rhs).isToZero('<='))
      }
      if (ast.operator === '<') {
        return this.done(lhs.order(rhs).isToZero('<'))
      }
      if (ast.operator === '>=') {
        return this.done(lhs.order(rhs).isToZero('>='))
      }
      if (ast.operator === '>') {
        return this.done(lhs.order(rhs).isToZero('>'))
      }
      if (ast.operator === '%') {
        return this.done(lhs.modulo(rhs))
      }
      if (ast.operator === '*') {
        return this.done(lhs.times(rhs))
      }
      if (ast.operator === '**') {
        return this.done(lhs.power(rhs))
      }
      if (ast.operator === '+') {
        return this.done(lhs.plus(rhs))
      }
      if (ast.operator === '-') {
        return this.done(lhs.minus(rhs))
      }
      if (ast.operator === '/') {
        return this.done(lhs.over(rhs))
      }

      shouldNeverHappen(ast.operator)
    }

    if (ast.tag === 'unaryOperator') {
      const slotName = 'operand'
      const operand = frame.slots[slotName]
      if (operand === undefined) {
        return this.mkFrame(ast.operand, table, frame, slotName)
      }

      if (ast.operator === '!') {
        return this.done(operand.not())
      }
      if (ast.operator === '+') {
        // We intentionally do <0 + operand> instead of just <operand>. This is due to type-checking: the latter will
        // evaluate to the operand as-is, making expression such as `+true` dynamically valid (which is not the desired
        // behavior)
        return this.done(Value.num(0).plus(operand))
      }
      if (ast.operator === '-') {
        return this.done(operand.negate())
      }

      shouldNeverHappen(ast.operator)
    }

    if (ast.tag === 'ident') {
      return this.done(table.lookup(ast.t.text))
    }

    if (ast.tag === 'formalArg') {
      if (ast.defaultValue) {
        const slotName = 'defaultValue'
        const v = frame.slots[slotName]
        if (v === undefined) {
          return this.mkFrame(ast.defaultValue, table, frame, slotName)
        }
        return this.done(v)
      }

      // This error should not be reached. The call flow should evaluate a formalArg node only when if it has
      // a default value sud-node.
      throw new Error(`no default value for ${ast}`)
    }

    if (ast.tag === 'literal') {
      if (ast.type === 'bool') {
        // TODO(imaman): stricter checking of 'false'
        return this.done(Value.bool(ast.t.text === 'true' ? true : false))
      }
      if (ast.type === 'num') {
        return this.done(Value.num(Number(ast.t.text)))
      }
      if (ast.type === 'str') {
        return this.done(Value.str(ast.t.text))
      }
      if (ast.type === 'undef') {
        return this.done(Value.undef())
      }
      shouldNeverHappen(ast.type)
    }

    if (ast.tag === 'templateLiteral') {
      for (let i = 0; i < ast.parts.length; ++i) {
        const part = ast.parts[i]
        if (part.tag !== 'expression') {
          continue
        }

        const slotName = `expression:${i}`
        if (frame.slots[slotName] === undefined) {
          return this.mkFrame(part.expr, table, frame, slotName)
        }
      }

      const result = ast.parts
        .map((part, i) => {
          if (part.tag === 'string') {
            return part.value
          }
          const v = this.readSlot(frame, `expression:${i}`)
          return v.toString()
        })
        .join('')
      return this.done(Value.str(result))
    }

    if (ast.tag === 'arrayLiteral') {
      for (let i = 0; i < ast.parts.length; ++i) {
        const curr = ast.parts[i]
        const slotName = `part:${i}`
        if (frame.slots[slotName] === undefined) {
          return this.mkFrame(curr.v, table, frame, slotName)
        }
      }

      const arr: Value[] = []
      for (let i = 0; i < ast.parts.length; ++i) {
        const curr = ast.parts[i]
        const v = this.readSlot(frame, `part:${i}`)
        if (curr.tag === 'element') {
          arr.push(v)
        } else if (curr.tag === 'spread') {
          if (v.isUndefined()) {
            continue
          }
          arr.push(...v.assertArr())
        } else {
          shouldNeverHappen(curr)
        }
      }

      return this.done(Value.arr(arr))
    }

    if (ast.tag === 'objectLiteral') {
      for (let i = 0; i < ast.parts.length; ++i) {
        const part = ast.parts[i]
        if (part.tag === 'hardName' || part.tag === 'quotedString') {
          const valueSlot = `part:${i}:v`
          if (frame.slots[valueSlot] === undefined) {
            return this.mkFrame(part.v, table, frame, valueSlot)
          }
          continue
        }

        if (part.tag === 'computedName') {
          const keySlot = `part:${i}:k`
          if (frame.slots[keySlot] === undefined) {
            return this.mkFrame(part.k, table, frame, keySlot)
          }
          const valueSlot = `part:${i}:v`
          if (frame.slots[valueSlot] === undefined) {
            return this.mkFrame(part.v, table, frame, valueSlot)
          }
          continue
        }

        if (part.tag === 'spread') {
          const objectSlot = `part:${i}:o`
          if (frame.slots[objectSlot] === undefined) {
            return this.mkFrame(part.o, table, frame, objectSlot)
          }
          continue
        }

        shouldNeverHappen(part)
      }

      const entries: [string, Value][] = ast.parts.flatMap((part, i) => {
        if (part.tag === 'hardName') {
          return [[part.k.t.text, this.readSlot(frame, `part:${i}:v`)]]
        }
        if (part.tag === 'quotedString') {
          return [[part.k.t.text, this.readSlot(frame, `part:${i}:v`)]]
        }
        if (part.tag === 'computedName') {
          const k = this.readSlot(frame, `part:${i}:k`)
          const v = this.readSlot(frame, `part:${i}:v`)
          return [[k.assertStr(), v]]
        }
        if (part.tag === 'spread') {
          const o = this.readSlot(frame, `part:${i}:o`)
          if (o.isUndefined()) {
            return []
          }
          const spreadObject = o.assertObj()
          const spreadEntries: [string, Value][] = []
          for (const k of Object.keys(spreadObject)) {
            spreadEntries.push([k, spreadObject[k]])
          }
          return spreadEntries
        }

        shouldNeverHappen(part)
      })

      // TODO(imaman): verify type of all keys (strings, maybe also numbers)
      return this.done(Value.obj(Object.fromEntries(entries.filter(([_, v]) => !v.isUndefined()))))
    }

    if (ast.tag === 'lambda') {
      return this.done(Value.lambda(ast, table))
    }

    if (ast.tag === 'functionCall') {
      for (let i = 0; i < ast.actualArgs.length; ++i) {
        const slotName = `arg:${i}`
        if (frame.slots[slotName] === undefined) {
          return this.mkFrame(ast.actualArgs[i], table, frame, slotName)
        }
      }

      const calleeSlot = 'callee'
      const callee = frame.slots[calleeSlot]
      if (callee === undefined) {
        return this.mkFrame(ast.callee, table, frame, calleeSlot)
      }

      const argValues: Value[] = ast.actualArgs.map((_, i) => this.readSlot(frame, `arg:${i}`))
      if (!callee.isLambda()) {
        return this.done(this.call(callee, argValues))
      }

      let state = frame.state
      if (!state) {
        const lambda = callee.assertLambda()
        const formals = lambda.ast.formalArgs
        const requiredCount = formals.filter(f => !f.defaultValue).length
        if (argValues.length < requiredCount) {
          throw new Error(`Expected at least ${requiredCount} argument(s) but got ${argValues.length}`)
        }
        state = {
          tag: 'lambda-call',
          formals,
          body: lambda.ast.body,
          lambdaTable: lambda.table,
          newTable: lambda.table,
          actualValues: argValues,
          nextFormalIndex: 0,
        }
        frame.state = state
      }
      if (state.tag !== 'lambda-call') {
        return failMe<StepResult>(`Invalid state for lambda call frame`)
      }

      while (state.nextFormalIndex < state.formals.length) {
        const i = state.nextFormalIndex
        const formal = state.formals[i]
        let actual = state.actualValues.at(i)
        const useDefault = actual === undefined || (actual.isUndefined() && formal.defaultValue)

        if (useDefault && formal.defaultValue) {
          const slotName = `default:${i}`
          const defaultValue = frame.slots[slotName]
          if (defaultValue === undefined) {
            return this.mkFrame(formal.defaultValue, state.lambdaTable, frame, slotName)
          }
          actual = defaultValue
        }

        if (actual === undefined) {
          throw new Error(`A value must be passed to formal argument: ${show(formal.ident)}`)
        }

        state.newTable = new SymbolFrame(formal.ident.t.text, { destination: actual }, state.newTable, 'INTERNAL')
        state.nextFormalIndex += 1
      }

      const bodySlot = 'body'
      const bodyResult = frame.slots[bodySlot]
      if (bodyResult === undefined) {
        return this.mkFrame(state.body, state.newTable, frame, bodySlot)
      }
      return this.done(bodyResult)
    }

    if (ast.tag === 'if' || ast.tag === 'ternary') {
      const conditionSlot = 'condition'
      const c = frame.slots[conditionSlot]
      if (c === undefined) {
        return this.mkFrame(ast.condition, table, frame, conditionSlot)
      }

      const branch = c.assertBool() ? ast.positive : ast.negative
      const branchSlot = c.assertBool() ? 'positive' : 'negative'
      const cachedBranchValue = frame.slots[branchSlot]
      if (cachedBranchValue === undefined) {
        return this.mkFrame(branch, table, frame, branchSlot)
      }
      return this.done(cachedBranchValue)
    }

    if (ast.tag === 'dot') {
      const recSlot = 'receiver'
      const rec = frame.slots[recSlot]
      if (rec === undefined) {
        return this.mkFrame(ast.receiver, table, frame, recSlot)
      }
      if (rec === undefined || rec === null) {
        throw new Error(`Cannot access attribute .${ast.ident.t.text} of ${rec}`)
      }
      return this.done(rec.access(ast.ident.t.text, (callee, args) => this.call(callee, args)))
    }

    if (ast.tag === 'indexAccess') {
      const recSlot = 'receiver'
      const rec = frame.slots[recSlot]
      if (rec === undefined) {
        return this.mkFrame(ast.receiver, table, frame, recSlot)
      }

      const indexSlot = 'index'
      const index = frame.slots[indexSlot]
      if (index === undefined) {
        return this.mkFrame(ast.index, table, frame, indexSlot)
      }
      return this.done(rec.access(index, (callee, args) => this.call(callee, args)))
    }

    shouldNeverHappen(ast)
  }

  call(callee: Value, actualValues: Value[]) {
    return callee.call(actualValues, (formals, body, lambdaTable: SymbolTable) => {
      const requiredCount = formals.filter(f => !f.defaultValue).length
      if (actualValues.length < requiredCount) {
        throw new Error(`Expected at least ${requiredCount} argument(s) but got ${actualValues.length}`)
      }

      let newTable = lambdaTable
      for (let i = 0; i < formals.length; ++i) {
        const formal = formals[i]
        let actual = actualValues.at(i)
        const useDefault = actual === undefined || (actual.isUndefined() && formal.defaultValue)

        if (useDefault && formal.defaultValue) {
          actual = this.evalLoop(formal.defaultValue, lambdaTable)
        }

        if (actual === undefined) {
          throw new Error(`A value must be passed to formal argument: ${show(formal.ident)}`)
        }

        newTable = new SymbolFrame(formal.ident.t.text, { destination: actual }, newTable, 'INTERNAL')
      }
      return this.evalLoop(body, newTable)
    })
  }
}
