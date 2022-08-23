import { Parser } from './parser'
import { Value } from './value'

export class Runtime {
  constructor(private readonly parser: Parser) {}

  evaluate() {
    const ret = this.expression()
    if (!this.parser.eof()) {
      const s = this.parser.synopsis()
      throw new Error(`Loitering input at position ${s.position}: <${s.lookingAt}>`)
    }
    return ret
  }

  expression(): Value {
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
      return lhs.equalsTo(this.equality()).negate()
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
    const lhs = this.unary()
    if (this.parser.consumeIf('*')) {
      return lhs.times(this.multiplication())
    }
    if (this.parser.consumeIf('/')) {
      return lhs.over(this.multiplication())
    }
    if (this.parser.consumeIf('%')) {
      return lhs.rem(this.multiplication())
    }
    return lhs
  }

  unary(): Value {
    if (this.parser.consumeIf('(')) {
      const ret = this.expression()
      this.parser.consume(')')
      return ret
    }

    if (this.parser.consumeIf('!')) {
      const e = this.unary()
      return e.not()
    }

    return this.literal()
  }

  literal(): Value {
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

    const s = this.parser.synopsis()
    throw new Error(`Unparsable input at position ${s.position}: ${s.lookingAt}`)
  }
}
