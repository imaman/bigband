import { Scanner } from './scanner'
import { Value } from './value'

const IDENT = /[a-zA-Z][0-9A-Za-z_]*/

export class Runtime {
  private readonly envs = [new Map<string, Value>()]

  constructor(private readonly scanner: Scanner) {}

  evaluate() {
    const ret = this.expression()
    if (!this.scanner.eof()) {
      const s = this.scanner.synopsis()
      throw new Error(`Loitering input at position ${s.position}: <${s.lookingAt}>`)
    }
    return ret
  }

  definitions() {
    const table = new Map<string, Value>()
    this.envs.push(table)
    while (this.scanner.consumeIf('let ')) {
      const ident = this.scanner.consume(IDENT)
      this.scanner.consume('=')
      const v = this.or()
      this.scanner.consume(';')

      table.set(ident, v)
    }
  }

  expression(): Value {
    this.definitions()
    return this.lambda()
  }

  lambda(): Value {
    if (this.scanner.consumeIf('fun')) {
      //
    }

    return this.or()
  }

  or(): Value {
    const lhs = this.and()
    if (this.scanner.consumeIf('||')) {
      return lhs.or(this.or())
    }
    return lhs
  }

  and(): Value {
    const lhs = this.equality()
    if (this.scanner.consumeIf('&&')) {
      return lhs.and(this.and())
    }
    return lhs
  }

  equality(): Value {
    const lhs = this.comparison()
    if (this.scanner.consumeIf('==')) {
      return lhs.equalsTo(this.equality())
    }
    if (this.scanner.consumeIf('!=')) {
      return lhs.equalsTo(this.equality()).not()
    }
    return lhs
  }

  comparison(): Value {
    const lhs = this.addition()
    if (this.scanner.consumeIf('>=')) {
      return new Value(lhs.compare(this.comparison()) >= 0)
    }
    if (this.scanner.consumeIf('<=')) {
      return new Value(lhs.compare(this.comparison()) <= 0)
    }
    if (this.scanner.consumeIf('>')) {
      return new Value(lhs.compare(this.comparison()) > 0)
    }
    if (this.scanner.consumeIf('<')) {
      return new Value(lhs.compare(this.comparison()) < 0)
    }
    return lhs
  }

  addition(): Value {
    const lhs = this.multiplication()
    if (this.scanner.consumeIf('+')) {
      return lhs.plus(this.addition())
    }
    if (this.scanner.consumeIf('-')) {
      return lhs.minus(this.addition())
    }
    return lhs
  }

  multiplication(): Value {
    const lhs = this.power()
    if (this.scanner.consumeIf('*')) {
      return lhs.times(this.multiplication())
    }
    if (this.scanner.consumeIf('/')) {
      return lhs.over(this.multiplication())
    }
    if (this.scanner.consumeIf('%')) {
      return lhs.modulo(this.multiplication())
    }
    return lhs
  }

  power(): Value {
    const lhs = this.unary()
    if (this.scanner.consumeIf('**')) {
      return lhs.power(this.power())
    }
    return lhs
  }

  unary(): Value {
    if (this.scanner.consumeIf('!')) {
      const e = this.unary()
      return e.not()
    }
    if (this.scanner.consumeIf('+')) {
      return this.unary()
    }
    if (this.scanner.consumeIf('-')) {
      return this.unary().negate()
    }

    return this.functionCall()
  }

  functionCall(): Value {
    return this.parenthesized()
  }

  parenthesized(): Value {
    if (this.scanner.consumeIf('(')) {
      const ret = this.expression()
      this.scanner.consume(')')
      return ret
    }

    return this.literalOrIdent()
  }

  literalOrIdent(): Value {
    if (this.scanner.consumeIf('true')) {
      return new Value(true)
    }
    if (this.scanner.consumeIf('false')) {
      return new Value(false)
    }

    const n = this.scanner.consumeIf(/[0-9]+/)
    if (n !== undefined) {
      if (!this.scanner.consumeIf('.')) {
        return new Value(Number(n))
      }

      const fracture = this.scanner.consumeIf(/[0-9]+/)
      return new Value(Number(`${n}.${fracture}`))
    }

    const syn = this.scanner.synopsis()
    const ident = this.scanner.consumeIf(IDENT)
    if (ident) {
      return this.lookup(ident, syn.position)
    }

    const s = this.scanner.synopsis()
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
