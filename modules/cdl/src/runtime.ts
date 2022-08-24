import { AstNode } from './ast-node'
import { shouldNeverHappen } from './should-never-happen'
import { Value } from './value'

interface SymbolTable {
  lookup(sym: string): Value
}

class SymbolFrame implements SymbolTable {
  constructor(readonly symbol: string, readonly value: Value, private readonly earlier: SymbolTable) {}

  lookup(sym: string): Value {
    if (this.symbol === sym) {
      return this.value
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
          return Value.fromBool(true)
        }

        const rhs = this.evalNode(ast.rhs, table)
        rhs.assertBool()
        return rhs
      }
      if (ast.operator === '&&') {
        if (!lhs.assertBool()) {
          return Value.fromBool(false)
        }
        const rhs = this.evalNode(ast.rhs, table)
        rhs.assertBool()
        return rhs
      }

      const rhs = this.evalNode(ast.rhs, table)
      if (ast.operator === '!=') {
        const comp = lhs.compare(rhs)
        return Value.fromBool(comp !== 0)
      }
      if (ast.operator === '==') {
        const comp = lhs.compare(rhs)
        return Value.fromBool(comp === 0)
      }

      if (ast.operator === '<=') {
        const comp = lhs.compare(rhs)
        return Value.fromBool(comp <= 0)
      }
      if (ast.operator === '<') {
        const comp = lhs.compare(rhs)
        return Value.fromBool(comp < 0)
      }
      if (ast.operator === '>=') {
        const comp = lhs.compare(rhs)
        return Value.fromBool(comp >= 0)
      }
      if (ast.operator === '>') {
        const comp = lhs.compare(rhs)
        return Value.fromBool(comp > 0)
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
      const parsed = JSON.parse(ast.t.text)
      if (typeof parsed === 'boolean') {
        return Value.fromBool(parsed)
      } else if (typeof parsed === 'number') {
        return Value.fromNum(parsed)
      }
      throw new Error(`Unsupported literal: <${ast.t.text}> at ${ast.t.offset}`)
    }

    if (ast.tag === 'topLevelExpression') {
      let newTable = table
      for (const def of ast.definitions) {
        const name = def.ident.t.text
        const v = this.evalNode(def.value, newTable)
        newTable = new SymbolFrame(name, v, newTable)
      }

      return this.evalNode(ast.computation, newTable)
    }

    if (ast.tag === 'lambda') {
      return Value.fromLambda(ast)
    }

    shouldNeverHappen(ast)
  }
}
