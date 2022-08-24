import { Scanner } from './scanner'
import { Value } from './value'

const IDENT = /[a-zA-Z][0-9A-Za-z_]*/

export class Runtime {
  private readonly envs = [new Map<string, Value>()]

  constructor(private readonly parser: Scanner) {}

  evaluate() {
    const ret = this.expression()
    if (!this.parser.eof()) {
      const s = this.parser.synopsis()
      throw new Error(`Loitering input at position ${s.position}: <${s.lookingAt}>`)
    }
    return ret
  }

  definitions() {
    const table = new Map<string, Value>()
    this.envs.push(table)
    while (this.parser.consumeIf('let ')) {
      const ident = this.parser.consume(IDENT)
      this.parser.consume('=')
      const v = this.or()
      this.parser.consume(';')

      table.set(ident, v)
    }
  }

  expression(): Value {
    this.definitions()
    return this.lambda()
  }

  lambda(): Value {
    if (this.parser.consumeIf('fun')) {
      //
    }

    return this.or()
  }

  or(): Value {
    const lhs = this.and()
    if (this.parser.consumeIf('||')) {
      return lhs.or(this.or())
    }
    return lhs
  }

  and(): Value {
    const lhs = this.equality()
    if (this.parser.consumeIf('&&')) {
      return lhs.and(this.and())
    }
    return lhs
  }

  equality(): Value {
    const lhs = this.comparison()
    if (this.parser.consumeIf('==')) {
      return lhs.equalsTo(this.equality())
    }
    if (this.parser.consumeIf('!=')) {
      return lhs.equalsTo(this.equality()).not()
    }
    return lhs
  }

  comparison(): Value {
    const lhs = this.addition()
    if (this.parser.consumeIf('>=')) {
      return new Value(lhs.compare(this.comparison()) >= 0)
    }
    if (this.parser.consumeIf('<=')) {
      return new Value(lhs.compare(this.comparison()) <= 0)
    }
    if (this.parser.consumeIf('>')) {
      return new Value(lhs.compare(this.comparison()) > 0)
    }
    if (this.parser.consumeIf('<')) {
      return new Value(lhs.compare(this.comparison()) < 0)
    }
    return lhs
  }

  addition(): Value {
    const lhs = this.multiplication()
    if (this.parser.consumeIf('+')) {
      return lhs.plus(this.addition())
    }
    if (this.parser.consumeIf('-')) {
      return lhs.minus(this.addition())
    }
    return lhs
  }

  multiplication(): Value {
    const lhs = this.power()
    if (this.parser.consumeIf('*')) {
      return lhs.times(this.multiplication())
    }
    if (this.parser.consumeIf('/')) {
      return lhs.over(this.multiplication())
    }
    if (this.parser.consumeIf('%')) {
      return lhs.modulo(this.multiplication())
    }
    return lhs
  }

  power(): Value {
    const lhs = this.unary()
    if (this.parser.consumeIf('**')) {
      return lhs.power(this.power())
    }
    return lhs
  }

  unary(): Value {
    if (this.parser.consumeIf('!')) {
      const e = this.unary()
      return e.not()
    }
    if (this.parser.consumeIf('+')) {
      return this.unary()
    }
    if (this.parser.consumeIf('-')) {
      return this.unary().negate()
    }

    return this.functionCall()
  }

  functionCall(): Value {
    return this.parenthesized()
  }

  parenthesized(): Value {
    if (this.parser.consumeIf('(')) {
      const ret = this.expression()
      this.parser.consume(')')
      return ret
    }

    return this.literalOrIdent()
  }

  literalOrIdent(): Value {
    if (this.parser.consumeIf('true')) {
      return new Value(true)
    }
    if (this.parser.consumeIf('false')) {
      return new Value(false)
    }

    const n = this.parser.consumeIf(/[0-9]+/)
    if (n !== undefined) {
      if (!this.parser.consumeIf('.')) {
        return new Value(Number(n))
      }

      const fracture = this.parser.consumeIf(/[0-9]+/)
      return new Value(Number(`${n}.${fracture}`))
    }

    const syn = this.parser.synopsis()
    const ident = this.parser.consumeIf(IDENT)
    if (ident) {
      return this.lookup(ident, syn.position)
    }

    const s = this.parser.synopsis()
    throw new Error(`Unparsable input at position ${s.position}: ${s.lookingAt}`)
  }

  lookup(ident: string, position: number) {
    for (let i = this.envs.length - 1; i >= 0; --i) {
      const table = this.envs[i]
      const val = table.get(ident)
      if (val) {
        return val
      }
    }

    throw new Error(`Symbol not found: ${ident} (at position ${position})`)
  }
}
