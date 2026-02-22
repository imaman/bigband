import crypto from 'crypto'

import {
  ArrayLiteralPart,
  AstNode,
  FormalArg,
  Let,
  ObjectLiteralPart,
  show,
  TemplatePart,
  Unit,
  UnitId,
} from './ast-node'
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

// Continuation types for the iterative evaluator
type Cont =
  | { tag: 'popTrace'; ast: AstNode }
  | { tag: 'binaryRhs'; operator: string; rhs: AstNode; table: SymbolTable }
  | { tag: 'binaryApply'; operator: string; lhs: Value }
  | { tag: 'validateBool'; lhs: Value; operator: '||' | '&&' }
  | { tag: 'unaryApply'; operator: '+' | '-' | '!' }
  | { tag: 'ifBranch'; positive: AstNode; negative: AstNode; table: SymbolTable }
  | { tag: 'funcCollectArgs'; collectedArgs: Value[]; remainingArgs: AstNode[]; table: SymbolTable; callee: AstNode }
  | { tag: 'funcEvalCallee'; args: Value[]; table: SymbolTable; callee: AstNode }
  | { tag: 'funcApply'; args: Value[] }
  | { tag: 'dotAccess'; ident: string }
  | { tag: 'indexEvalIndex'; index: AstNode; table: SymbolTable }
  | { tag: 'indexApply'; receiver: Value }
  | { tag: 'templateCollect'; collectedParts: string[]; remainingParts: TemplatePart[]; table: SymbolTable }
  | {
      tag: 'arrayCollect'
      collectedElements: Value[]
      isSpread: boolean
      remainingParts: ArrayLiteralPart[]
      table: SymbolTable
    }
  | {
      tag: 'objCollect'
      collectedEntries: [string, Value][]
      remainingParts: ObjectLiteralPart[]
      table: SymbolTable
    }
  | {
      tag: 'objComputedValue'
      key: string
      collectedEntries: [string, Value][]
      remainingParts: ObjectLiteralPart[]
      table: SymbolTable
    }
  | {
      tag: 'objComputedKey'
      valueAst: AstNode
      collectedEntries: [string, Value][]
      remainingParts: ObjectLiteralPart[]
      table: SymbolTable
    }
  | {
      tag: 'topLevelDef'
      definitions: Let[]
      defIndex: number
      placeholder: Placeholder
      table: SymbolTable
      computation: AstNode | undefined
      throwToken: boolean
      unitId: UnitId
    }
  | { tag: 'topLevelComputation'; throwToken: boolean }
  | { tag: 'throwValue' }

type StepResult = { tag: 'value'; val: Value } | { tag: 'eval'; ast: AstNode; table: SymbolTable }

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
      const value = this.evalLoop(this.root, this.buildInitialSymbolTable(true))
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
      return this.evalLoop(exporStarUnit, this.buildInitialSymbolTable(false))
    }

    shouldNeverHappen(exp)
  }

  /**
   * Iterative evaluation loop. Replaces the recursive evalNode/evalNodeImpl.
   * Uses an explicit continuation stack to avoid JS call stack overflow on deep recursion.
   */
  private evalLoop(initialAst: AstNode, initialTable: SymbolTable): Value {
    const contStack: Cont[] = []
    let mode: 'eval' | 'apply' = 'eval'
    let currentAst: AstNode = initialAst
    let currentTable: SymbolTable = initialTable
    let currentValue: Value = Value.undef() // placeholder, only meaningful in 'apply' mode

    for (;;) {
      if (mode === 'eval') {
        // Push trace
        this.stack = Stack.push(currentAst, this.stack)
        contStack.push({ tag: 'popTrace', ast: currentAst })

        const result = this.step(currentAst, currentTable, contStack)
        if (result.tag === 'value') {
          mode = 'apply'
          currentValue = result.val
        } else {
          // result.tag === 'eval' — continuations already pushed by step()
          currentAst = result.ast
          currentTable = result.table
          // stay in 'eval' mode
        }
      } else {
        // mode === 'apply'
        if (contStack.length === 0) {
          return currentValue
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const cont = contStack.pop()!
        const result = this.applyCont(cont, currentValue, contStack)
        if (result.tag === 'value') {
          currentValue = result.val
          // stay in 'apply' mode
        } else {
          // result.tag === 'eval'
          mode = 'eval'
          currentAst = result.ast
          currentTable = result.table
        }
      }
    }
  }

  /**
   * step() dispatches on AST tag. Either returns an immediate value or pushes continuation(s)
   * and returns a sub-evaluation request.
   */
  private step(ast: AstNode, table: SymbolTable, contStack: Cont[]): StepResult {
    if (ast.tag === 'unit') {
      let newTable = table
      for (const imp of ast.imports) {
        const o = this.importDefinitions(ast.unitId, imp.pathToImportFrom.text)
        newTable = new SymbolFrame(imp.ident.t.text, { destination: o }, newTable, 'INTERNAL')
      }
      // Tail eval the expression
      return { tag: 'eval', ast: ast.expression, table: newTable }
    }

    if (ast.tag === 'topLevelExpression') {
      if (ast.definitions.length === 0) {
        if (!ast.computation) {
          return { tag: 'value', val: Value.str('') }
        }
        if (ast.throwToken) {
          contStack.push({ tag: 'topLevelComputation', throwToken: true })
        }
        return { tag: 'eval', ast: ast.computation, table }
      }

      const def = ast.definitions[0]
      const placeholder: Placeholder = { destination: undefined }
      const newTable = new SymbolFrame(def.ident.t.text, placeholder, table, def.isExported ? 'EXPORTED' : 'INTERNAL')
      contStack.push({
        tag: 'topLevelDef',
        definitions: ast.definitions,
        defIndex: 0,
        placeholder,
        table: newTable,
        computation: ast.computation,
        throwToken: !!ast.throwToken,
        unitId: ast.unitId,
      })
      return { tag: 'eval', ast: def.value, table: newTable }
    }

    if (ast.tag === 'export*') {
      return { tag: 'value', val: Value.obj(table.exportValue()) }
    }

    if (ast.tag === 'binaryOperator') {
      contStack.push({ tag: 'binaryRhs', operator: ast.operator, rhs: ast.rhs, table })
      return { tag: 'eval', ast: ast.lhs, table }
    }

    if (ast.tag === 'unaryOperator') {
      contStack.push({ tag: 'unaryApply', operator: ast.operator })
      return { tag: 'eval', ast: ast.operand, table }
    }

    if (ast.tag === 'ident') {
      return { tag: 'value', val: table.lookup(ast.t.text) }
    }

    if (ast.tag === 'formalArg') {
      if (ast.defaultValue) {
        return { tag: 'eval', ast: ast.defaultValue, table }
      }
      throw new Error(`no default value for ${ast}`)
    }

    if (ast.tag === 'literal') {
      if (ast.type === 'bool') {
        return { tag: 'value', val: Value.bool(ast.t.text === 'true' ? true : false) }
      }
      if (ast.type === 'num') {
        return { tag: 'value', val: Value.num(Number(ast.t.text)) }
      }
      if (ast.type === 'str') {
        return { tag: 'value', val: Value.str(ast.t.text) }
      }
      if (ast.type === 'undef') {
        return { tag: 'value', val: Value.undef() }
      }
      shouldNeverHappen(ast.type)
    }

    if (ast.tag === 'templateLiteral') {
      if (ast.parts.length === 0) {
        return { tag: 'value', val: Value.str('') }
      }
      const first = ast.parts[0]
      const remaining = ast.parts.slice(1)
      if (first.tag === 'string') {
        // Start collecting from string part
        if (remaining.length === 0) {
          return { tag: 'value', val: Value.str(first.value) }
        }
        return this.stepTemplateCollect([first.value], remaining, table, contStack)
      }
      // first.tag === 'expression'
      contStack.push({ tag: 'templateCollect', collectedParts: [], remainingParts: remaining, table })
      return { tag: 'eval', ast: first.expr, table }
    }

    if (ast.tag === 'arrayLiteral') {
      if (ast.parts.length === 0) {
        return { tag: 'value', val: Value.arr([]) }
      }
      return this.stepArrayCollect([], ast.parts, table, contStack)
    }

    if (ast.tag === 'objectLiteral') {
      if (ast.parts.length === 0) {
        return { tag: 'value', val: Value.obj({}) }
      }
      return this.stepObjCollect([], ast.parts, table, contStack)
    }

    if (ast.tag === 'lambda') {
      return { tag: 'value', val: Value.lambda(ast, table) }
    }

    if (ast.tag === 'functionCall') {
      if (ast.actualArgs.length === 0) {
        contStack.push({ tag: 'funcEvalCallee', args: [], table, callee: ast.callee })
        return { tag: 'eval', ast: ast.callee, table }
      }
      // Evaluate first arg
      contStack.push({
        tag: 'funcCollectArgs',
        collectedArgs: [],
        remainingArgs: ast.actualArgs.slice(1),
        table,
        callee: ast.callee,
      })
      return { tag: 'eval', ast: ast.actualArgs[0], table }
    }

    if (ast.tag === 'if' || ast.tag === 'ternary') {
      contStack.push({ tag: 'ifBranch', positive: ast.positive, negative: ast.negative, table })
      return { tag: 'eval', ast: ast.condition, table }
    }

    if (ast.tag === 'dot') {
      contStack.push({ tag: 'dotAccess', ident: ast.ident.t.text })
      return { tag: 'eval', ast: ast.receiver, table }
    }

    if (ast.tag === 'indexAccess') {
      contStack.push({ tag: 'indexEvalIndex', index: ast.index, table })
      return { tag: 'eval', ast: ast.receiver, table }
    }

    shouldNeverHappen(ast)
  }

  /**
   * Helper to start evaluating the next array literal element
   */
  private stepArrayCollect(
    collected: Value[],
    remaining: ArrayLiteralPart[],
    table: SymbolTable,
    contStack: Cont[],
  ): StepResult {
    const part = remaining[0]
    const rest = remaining.slice(1)
    if (part.tag === 'element') {
      contStack.push({
        tag: 'arrayCollect',
        collectedElements: collected,
        isSpread: false,
        remainingParts: rest,
        table,
      })
      return { tag: 'eval', ast: part.v, table }
    }
    if (part.tag === 'spread') {
      contStack.push({ tag: 'arrayCollect', collectedElements: collected, isSpread: true, remainingParts: rest, table })
      return { tag: 'eval', ast: part.v, table }
    }
    shouldNeverHappen(part)
  }

  /**
   * Helper to start evaluating the next template literal part
   */
  private stepTemplateCollect(
    collected: string[],
    remaining: TemplatePart[],
    table: SymbolTable,
    contStack: Cont[],
  ): StepResult {
    const part = remaining[0]
    const rest = remaining.slice(1)
    if (part.tag === 'string') {
      collected.push(part.value)
      if (rest.length === 0) {
        return { tag: 'value', val: Value.str(collected.join('')) }
      }
      return this.stepTemplateCollect(collected, rest, table, contStack)
    }
    // part.tag === 'expression'
    contStack.push({ tag: 'templateCollect', collectedParts: collected, remainingParts: rest, table })
    return { tag: 'eval', ast: part.expr, table }
  }

  /**
   * Helper to start evaluating the next object literal part
   */
  private stepObjCollect(
    collected: [string, Value][],
    remaining: ObjectLiteralPart[],
    table: SymbolTable,
    contStack: Cont[],
  ): StepResult {
    const part = remaining[0]
    const rest = remaining.slice(1)
    if (part.tag === 'hardName') {
      contStack.push({
        tag: 'objComputedValue',
        key: part.k.t.text,
        collectedEntries: collected,
        remainingParts: rest,
        table,
      })
      return { tag: 'eval', ast: part.v, table }
    }
    if (part.tag === 'quotedString') {
      contStack.push({
        tag: 'objComputedValue',
        key: part.k.t.text,
        collectedEntries: collected,
        remainingParts: rest,
        table,
      })
      return { tag: 'eval', ast: part.v, table }
    }
    if (part.tag === 'computedName') {
      contStack.push({
        tag: 'objComputedKey',
        valueAst: part.v,
        collectedEntries: collected,
        remainingParts: rest,
        table,
      })
      return { tag: 'eval', ast: part.k, table }
    }
    if (part.tag === 'spread') {
      contStack.push({ tag: 'objCollect', collectedEntries: collected, remainingParts: rest, table })
      return { tag: 'eval', ast: part.o, table }
    }
    shouldNeverHappen(part)
  }

  /**
   * applyCont() processes a continuation with a computed value.
   * Either produces a final value or requests another sub-evaluation.
   */
  private applyCont(cont: Cont, val: Value, contStack: Cont[]): StepResult {
    if (cont.tag === 'popTrace') {
      switchOn(this.verbosity, {
        quiet: () => {},
        trace: () => {
          // eslint-disable-next-line no-console
          console.log(`output of <|${show(cont.ast)}|> is ${JSON.stringify(val)}  // ${cont.ast.tag}`)
        },
      })
      this.stack = Stack.pop(this.stack)
      return { tag: 'value', val }
    }

    if (cont.tag === 'binaryRhs') {
      const lhs = val
      // Short-circuit operators
      if (cont.operator === '||') {
        if (lhs.inner.tag !== 'bool') {
          throw new Error(`value type error: expected bool but found ${JSON.stringify(lhs)}`)
        }
        if (lhs.inner.val) {
          return { tag: 'value', val: Value.bool(true) }
        }
        contStack.push({ tag: 'validateBool', lhs, operator: '||' })
        return { tag: 'eval', ast: cont.rhs, table: cont.table }
      }
      if (cont.operator === '&&') {
        if (lhs.inner.tag !== 'bool') {
          throw new Error(`value type error: expected bool but found ${JSON.stringify(lhs)}`)
        }
        if (!lhs.inner.val) {
          return { tag: 'value', val: Value.bool(false) }
        }
        contStack.push({ tag: 'validateBool', lhs, operator: '&&' })
        return { tag: 'eval', ast: cont.rhs, table: cont.table }
      }
      if (cont.operator === '??') {
        if (!lhs.isUndefined()) {
          return { tag: 'value', val: lhs }
        }
        return { tag: 'eval', ast: cont.rhs, table: cont.table }
      }
      // Non-short-circuit: evaluate RHS
      contStack.push({ tag: 'binaryApply', operator: cont.operator, lhs })
      return { tag: 'eval', ast: cont.rhs, table: cont.table }
    }

    if (cont.tag === 'validateBool') {
      const rhs = val
      if (rhs.inner.tag !== 'bool') {
        throw new Error(`value type error: expected bool but found ${JSON.stringify(rhs)}`)
      }
      return { tag: 'value', val: rhs }
    }

    if (cont.tag === 'binaryApply') {
      const lhs = cont.lhs
      const rhs = val
      const op = cont.operator
      if (op === '!=') {
        return { tag: 'value', val: lhs.equalsTo(rhs).not() }
      }
      if (op === '==') {
        return { tag: 'value', val: lhs.equalsTo(rhs) }
      }
      if (op === '<=') {
        return { tag: 'value', val: lhs.order(rhs).isToZero('<=') }
      }
      if (op === '<') {
        return { tag: 'value', val: lhs.order(rhs).isToZero('<') }
      }
      if (op === '>=') {
        return { tag: 'value', val: lhs.order(rhs).isToZero('>=') }
      }
      if (op === '>') {
        return { tag: 'value', val: lhs.order(rhs).isToZero('>') }
      }
      if (op === '%') {
        return { tag: 'value', val: lhs.modulo(rhs) }
      }
      if (op === '*') {
        return { tag: 'value', val: lhs.times(rhs) }
      }
      if (op === '**') {
        return { tag: 'value', val: lhs.power(rhs) }
      }
      if (op === '+') {
        return { tag: 'value', val: lhs.plus(rhs) }
      }
      if (op === '-') {
        return { tag: 'value', val: lhs.minus(rhs) }
      }
      if (op === '/') {
        return { tag: 'value', val: lhs.over(rhs) }
      }
      throw new Error(`Unknown binary operator: ${op}`)
    }

    if (cont.tag === 'unaryApply') {
      if (cont.operator === '!') {
        return { tag: 'value', val: val.not() }
      }
      if (cont.operator === '+') {
        return { tag: 'value', val: Value.num(0).plus(val) }
      }
      if (cont.operator === '-') {
        return { tag: 'value', val: val.negate() }
      }
      shouldNeverHappen(cont.operator)
    }

    if (cont.tag === 'ifBranch') {
      const c = val
      if (c.inner.tag !== 'bool') {
        throw new Error(`value type error: expected bool but found ${JSON.stringify(c)}`)
      }
      // Tail eval the chosen branch
      if (c.inner.val) {
        return { tag: 'eval', ast: cont.positive, table: cont.table }
      }
      return { tag: 'eval', ast: cont.negative, table: cont.table }
    }

    if (cont.tag === 'funcCollectArgs') {
      const newCollected = [...cont.collectedArgs, val]
      if (cont.remainingArgs.length === 0) {
        // All args collected, evaluate callee
        contStack.push({ tag: 'funcApply', args: newCollected })
        return { tag: 'eval', ast: cont.callee, table: cont.table }
      }
      // Evaluate next arg
      contStack.push({
        tag: 'funcCollectArgs',
        collectedArgs: newCollected,
        remainingArgs: cont.remainingArgs.slice(1),
        table: cont.table,
        callee: cont.callee,
      })
      return { tag: 'eval', ast: cont.remainingArgs[0], table: cont.table }
    }

    if (cont.tag === 'funcEvalCallee') {
      // callee evaluated (no args case), proceed to apply
      return this.applyFunction(val, cont.args, contStack)
    }

    if (cont.tag === 'funcApply') {
      return this.applyFunction(val, cont.args, contStack)
    }

    if (cont.tag === 'dotAccess') {
      const rec = val
      if (rec === undefined || rec === null) {
        throw new Error(`Cannot access attribute .${cont.ident} of ${rec}`)
      }
      return { tag: 'value', val: rec.access(cont.ident, (callee, args) => this.callDirect(callee, args)) }
    }

    if (cont.tag === 'indexEvalIndex') {
      contStack.push({ tag: 'indexApply', receiver: val })
      return { tag: 'eval', ast: cont.index, table: cont.table }
    }

    if (cont.tag === 'indexApply') {
      const index = val
      return { tag: 'value', val: cont.receiver.access(index, (callee, args) => this.callDirect(callee, args)) }
    }

    if (cont.tag === 'templateCollect') {
      cont.collectedParts.push(val.toString())
      if (cont.remainingParts.length === 0) {
        return { tag: 'value', val: Value.str(cont.collectedParts.join('')) }
      }
      return this.stepTemplateCollect(cont.collectedParts, cont.remainingParts, cont.table, contStack)
    }

    if (cont.tag === 'arrayCollect') {
      if (cont.isSpread) {
        if (!val.isUndefined()) {
          cont.collectedElements.push(...val.assertArr())
        }
      } else {
        cont.collectedElements.push(val)
      }
      if (cont.remainingParts.length === 0) {
        return { tag: 'value', val: Value.arr(cont.collectedElements) }
      }
      return this.stepArrayCollect(cont.collectedElements, cont.remainingParts, cont.table, contStack)
    }

    if (cont.tag === 'objCollect') {
      // This handles spread in object literal
      const o = val
      if (!o.isUndefined()) {
        cont.collectedEntries.push(...Object.entries(o.assertObj()))
      }
      if (cont.remainingParts.length === 0) {
        return {
          tag: 'value',
          val: Value.obj(Object.fromEntries(cont.collectedEntries.filter(([_, v]) => !v.isUndefined()))),
        }
      }
      return this.stepObjCollect(cont.collectedEntries, cont.remainingParts, cont.table, contStack)
    }

    if (cont.tag === 'objComputedValue') {
      cont.collectedEntries.push([cont.key, val])
      if (cont.remainingParts.length === 0) {
        return {
          tag: 'value',
          val: Value.obj(Object.fromEntries(cont.collectedEntries.filter(([_, v]) => !v.isUndefined()))),
        }
      }
      return this.stepObjCollect(cont.collectedEntries, cont.remainingParts, cont.table, contStack)
    }

    if (cont.tag === 'objComputedKey') {
      const key = val.assertStr()
      contStack.push({
        tag: 'objComputedValue',
        key,
        collectedEntries: cont.collectedEntries,
        remainingParts: cont.remainingParts,
        table: cont.table,
      })
      return { tag: 'eval', ast: cont.valueAst, table: cont.table }
    }

    if (cont.tag === 'topLevelDef') {
      // Definition value computed, fill placeholder
      cont.placeholder.destination = val
      const nextIndex = cont.defIndex + 1
      if (nextIndex < cont.definitions.length) {
        // More definitions to process
        const def = cont.definitions[nextIndex]
        const placeholder: Placeholder = { destination: undefined }
        const newTable = new SymbolFrame(
          def.ident.t.text,
          placeholder,
          cont.table,
          def.isExported ? 'EXPORTED' : 'INTERNAL',
        )
        contStack.push({
          tag: 'topLevelDef',
          definitions: cont.definitions,
          defIndex: nextIndex,
          placeholder,
          table: newTable,
          computation: cont.computation,
          throwToken: cont.throwToken,
          unitId: cont.unitId,
        })
        return { tag: 'eval', ast: def.value, table: newTable }
      }
      // All definitions processed, evaluate computation
      if (!cont.computation) {
        return { tag: 'value', val: Value.str('') }
      }
      if (cont.throwToken) {
        contStack.push({ tag: 'topLevelComputation', throwToken: true })
      }
      return { tag: 'eval', ast: cont.computation, table: cont.table }
    }

    if (cont.tag === 'topLevelComputation') {
      if (cont.throwToken) {
        throw new Error(JSON.stringify(val))
      }
      return { tag: 'value', val }
    }

    if (cont.tag === 'throwValue') {
      throw new Error(JSON.stringify(val))
    }

    shouldNeverHappen(cont)
  }

  /**
   * Apply a function (lambda or foreign) with given args.
   * For lambdas, this does tail-eval of the body — no stack growth.
   */
  private applyFunction(callee: Value, args: Value[], _contStack: Cont[]): StepResult {
    const inner = callee.inner
    if (inner.tag === 'foreign') {
      return { tag: 'value', val: Value.from(inner.val(...args)) }
    }
    if (inner.tag === 'lambda') {
      const formals = inner.val.ast.formalArgs
      const body = inner.val.ast.body
      const lambdaTable = inner.val.table
      const requiredCount = formals.filter(f => !f.defaultValue).length
      if (args.length < requiredCount) {
        throw new Error(`Expected at least ${requiredCount} argument(s) but got ${args.length}`)
      }

      let newTable: SymbolTable = lambdaTable
      for (let i = 0; i < formals.length; ++i) {
        const formal = formals[i]
        let actual = args.at(i)
        const useDefault = actual === undefined || (actual.isUndefined() && formal.defaultValue)

        if (useDefault && formal.defaultValue) {
          actual = this.evalLoop(formal.defaultValue, lambdaTable)
        }

        if (actual === undefined) {
          throw new Error(`A value must be passed to formal argument: ${show(formal.ident)}`)
        }

        newTable = new SymbolFrame(formal.ident.t.text, { destination: actual }, newTable, 'INTERNAL')
      }
      // Tail eval the body — no continuation pushed, no stack growth
      return { tag: 'eval', ast: body, table: newTable }
    }
    throw new Error(`value type error: expected either foreign or lambda but found ${JSON.stringify(callee)}`)
  }

  /**
   * callDirect starts a fresh evalLoop for synchronous callbacks (array methods like .map, .filter, etc).
   * Since evalLoop is iterative, this adds only constant JS stack depth.
   */
  private callDirect(callee: Value, actualValues: Value[]): Value {
    return callee.call(actualValues, (formals: FormalArg[], body: AstNode, lambdaTable: SymbolTable) => {
      const requiredCount = formals.filter(f => !f.defaultValue).length
      if (actualValues.length < requiredCount) {
        throw new Error(`Expected at least ${requiredCount} argument(s) but got ${actualValues.length}`)
      }

      let newTable: SymbolTable = lambdaTable
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

  call(callee: Value, actualValues: Value[]) {
    return this.callDirect(callee, actualValues)
  }
}
