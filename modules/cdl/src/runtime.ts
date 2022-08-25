import { AstNode } from './ast-node'
import { Token } from './scanner'
import { shouldNeverHappen } from './should-never-happen'
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

export class Runtime {
  constructor(private readonly root: AstNode) {}

  run(): Value {
    return this.evalNode(this.root, new EmptySymbolTable())
  }

  private evalNode(ast: AstNode, table: SymbolTable): Value {
    if (ast.tag === 'binaryOperator') {
      const lhs = this.evalNode(ast.lhs, table)
      if (ast.operator === '||') {
        if (lhs.assertBool()) {
          return Value.bool(true)
        }

        const rhs = this.evalNode(ast.rhs, table)
        rhs.assertBool()
        return rhs
      }
      if (ast.operator === '&&') {
        if (!lhs.assertBool()) {
          return Value.bool(false)
        }
        const rhs = this.evalNode(ast.rhs, table)
        rhs.assertBool()
        return rhs
      }

      const rhs = this.evalNode(ast.rhs, table)
      if (ast.operator === '!=') {
        const comp = lhs.compare(rhs)
        return Value.bool(comp !== 0)
      }
      if (ast.operator === '==') {
        const comp = lhs.compare(rhs)
        return Value.bool(comp === 0)
      }

      if (ast.operator === '<=') {
        const comp = lhs.compare(rhs)
        return Value.bool(comp <= 0)
      }
      if (ast.operator === '<') {
        const comp = lhs.compare(rhs)
        return Value.bool(comp < 0)
      }
      if (ast.operator === '>=') {
        const comp = lhs.compare(rhs)
        return Value.bool(comp >= 0)
      }
      if (ast.operator === '>') {
        const comp = lhs.compare(rhs)
        return Value.bool(comp > 0)
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
        return operand
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
      return this.toValue(JSON.parse(ast.t.text), ast.t)
    }

    if (ast.tag === 'arrayLiteral') {
      return Value.arr(ast.elements.map(at => this.evalNode(at, table)))
    }

    if (ast.tag === 'objectLiteral') {
      const entries: [string, Value][] = ast.pairs.map(at => [at.k.t.text, this.evalNode(at.v, table)])
      return Value.obj(Object.fromEntries(entries))
    }

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

    if (ast.tag === 'lambda') {
      return Value.lambda(ast, table)
    }

    if (ast.tag === 'functionCall') {
      const argValues = ast.actualArgs.map(a => this.evalNode(a, table))
      const callee = this.evalNode(ast.callee, table)

      const l = callee.assertLambda()

      if (l.ast.formalArgs.length !== argValues.length) {
        throw new Error(`Arg list length mismatch: expected ${l.ast.formalArgs.length} but got ${argValues.length}`)
      }
      let newTable = l.table
      for (let i = 0; i < l.ast.formalArgs.length; ++i) {
        const name = l.ast.formalArgs[i].t.text
        newTable = new SymbolFrame(name, { destination: argValues[i] }, newTable)
      }

      return this.evalNode(l.ast.body, newTable)
    }

    if (ast.tag === 'if') {
      const c = this.evalNode(ast.condition, table)
      if (c.assertBool()) {
        return this.evalNode(ast.positive, table)
      } else {
        return this.evalNode(ast.negative, table)
      }
    }

    if (ast.tag === 'dot') {
      const rec = this.evalNode(ast.receiver, table)
      return rec.access(ast.ident.t.text)
    }

    shouldNeverHappen(ast)
  }

  toValue(parsed: unknown, token: Token) {
    if (typeof parsed === 'boolean') {
      return Value.bool(parsed)
    } else if (typeof parsed === 'number') {
      return Value.num(parsed)
    } else if (typeof parsed === 'string') {
      return Value.str(parsed)
    } else if (Array.isArray(parsed)) {
      return Value.arr(parsed)
    } else if (typeof parsed === 'object' && parsed) {
      for (const [k,v] of Object.entries(parsed)) {
        if (typeof k !== 'string') {
          throw new Error(`Invalid attribute name: ${k}`)
        }
        
        if (!(v instanceof Value)) {
          throw new Error(`Invalid attribute value: attribute ${k} has value ${v}`)
        }
      }
      return Value.obj(parsed as Record<string, Value>)
    }
    throw new Error(`Unsupported literal: <${token.text}> at ${token.offset}`)
  }
}
