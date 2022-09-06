import { AstNode, show } from './ast-node'
import { extractMessage } from './extract-message'
import { Parser } from './parser'
import { shouldNeverHappen } from './should-never-happen'
import * as Stack from './stack'
import { switchOn } from './switch-on'
import { SymbolTable } from './symbol-table'
import { Value } from './value'

interface Placeholder {
  destination: undefined | Value
}

class SymbolFrame implements SymbolTable {
  constructor(readonly symbol: string, readonly placeholder: Placeholder, private readonly earlier: SymbolTable) {}

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
}

class EmptySymbolTable implements SymbolTable {
  lookup(sym: string): Value {
    throw new Error(`Symbol ${sym} was not found`)
  }
}

export type Verbosity = 'quiet' | 'trace'

export class Runtime {
  private stack: Stack.T = undefined
  constructor(
    private readonly root: AstNode,
    private readonly verbosity: Verbosity = 'quiet',
    private readonly parser: Parser,
  ) {}

  compute() {
    const empty = new EmptySymbolTable()

    const keys = Value.foreign(o => o.keys())
    const entries = Value.foreign(o => o.entries())
    const fromEntries = Value.foreign(o => o.fromEntries())
    const lib = new SymbolFrame('Object', { destination: Value.obj({ keys, entries, fromEntries }) }, empty)
    try {
      const value = this.evalNode(this.root, lib)
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
    let ret = this.evalNodeImpl(ast, table)
    if (ret.isSink() && !ret.span()) {
      ret = ret.bindToSpan(this.parser.span(ast))
    }
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

  private evalNodeImpl(ast: AstNode, table: SymbolTable): Value {
    if (ast.tag === 'topLevelExpression') {
      let newTable = table
      for (const def of ast.definitions) {
        const name = def.ident.t.text
        const placeholder: Placeholder = { destination: undefined }
        newTable = new SymbolFrame(name, placeholder, newTable)
        const v = this.evalNode(def.value, newTable)
        placeholder.destination = v
      }

      return this.evalNode(ast.computation, newTable)
    }

    if (ast.tag === 'binaryOperator') {
      const lhs = this.evalNode(ast.lhs, table)
      if (ast.operator === '||') {
        return lhs.or(() => this.evalNode(ast.rhs, table))
      }
      if (ast.operator === '&&') {
        return lhs.and(() => this.evalNode(ast.rhs, table))
      }

      if (ast.operator === '??') {
        return lhs.unsink(() => this.evalNode(ast.rhs, table))
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
    if (ast.tag === 'literal') {
      if (ast.type === 'bool') {
        // TODO(imaman): stricter checking of 'false'
        return Value.bool(ast.t.text === 'true' ? true : false)
      }
      if (ast.type === 'num') {
        return Value.num(Number(ast.t.text))
      }
      if (ast.type === 'sink+') {
        return Value.sink(undefined, this.stack)
      }
      if (ast.type === 'sink') {
        return Value.sink()
      }
      if (ast.type === 'str') {
        return Value.str(ast.t.text)
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
        if (at.tag === 'computedName') {
          return [[this.evalNode(at.k, table).assertStr(), this.evalNode(at.v, table)]]
        }
        if (at.tag === 'spread') {
          const o = this.evalNode(at.o, table)
          return Object.entries(o.assertObj())
        }

        shouldNeverHappen(at)
      })

      // TODO(imaman): verify type of all keys (strings, maybe also numbers)
      return Value.obj(Object.fromEntries(entries))
    }

    if (ast.tag === 'lambda') {
      return Value.lambda(ast, table)
    }

    if (ast.tag === 'functionCall') {
      const argValues = ast.actualArgs.map(a => this.evalNode(a, table))
      const callee = this.evalNode(ast.callee, table)

      return this.call(callee, argValues)
    }

    if (ast.tag === 'if') {
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

  call(callee: Value, argValues: Value[]) {
    return callee.call(argValues, (names, body, lambdaTable: SymbolTable) => {
      if (names.length > argValues.length) {
        throw new Error(`Arg list length mismatch: expected ${names.length} but got ${argValues.length}`)
      }
      const newTable = names.reduce((t, n, i) => new SymbolFrame(n, { destination: argValues[i] }, t), lambdaTable)
      return this.evalNode(body, newTable)
    })
  }
}
