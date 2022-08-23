export function foo() {}

export function parse(s: string) {
  const p = new Parser(s)
  const runtime = new Runtime(p)
  return runtime.evaluate().export()
}

class Runtime {
  constructor(private readonly parser: Parser) {}

  evaluate() {
    return this.expression()
  }

  expression(): Value {
    const lhs = this.multiplication()
    if (this.parser.eof()) {
      return lhs
    }
    const x = this.parser.consumeAny('+', '-')
    const rhs = this.expression()
    if (x === '+') {
      return lhs.plus(rhs)
    }

    if (x === '-') {
      return lhs.minus(rhs)
    }
    throw new Error(`Should never happen (x=${x})`)
  }

  multiplication(): Value {
    const lhs = this.unary()
    if (this.parser.eof()) {
      return lhs
    }
    const x = this.parser.consumeAny('*', '/')
    const rhs = this.multiplication()
    if (x === '*') {
      return lhs.times(rhs)
    }

    if (x === '/') {
      return lhs.over(rhs)
    }

    throw new Error(`Should never happen (x=${x})`)
  }

  unary(): Value {
    if (this.parser.consumeIf('(')) {
      const ret = this.expression()
      this.parser.consume(')')
      return ret
    }

    if (this.parser.consumeIf('!')) {
      const e = this.expression()
      return e.not()
    }

    return this.literal()
  }

  literal(): Value {
    const n = this.parser.consumeIf(/[0-9]+/)
    if (n !== undefined) {
      return new Value(Number(n))
    }

    const s = this.parser.synopsis()
    throw new Error(`Unparsable input at position ${s.position}: ${s.lookingAt}`)
  }
}

class Parser {
  private offset = 0
  constructor(private input: string) {}

  private curr() {
    return this.input.substring(this.offset)
  }

  eof() {
    return this.offset >= this.input.length
  }

  synopsis() {
    const c = this.curr()
    let lookingAt = c.substring(0, 20)
    if (lookingAt.length !== c.length) {
      lookingAt = `${lookingAt}...`
    }

    return {
      position: this.offset,
      lookingAt,
    }
  }

  consumeAny(...r: string[]) {
    for (const curr of r) {
      const m = this.isMatching(curr)
      if (m) {
        return m
      }
    }

    throw new Error(
      `Expected one of ${r.join(', ')} at position ${this.offset} but found: ${this.synopsis().lookingAt}`,
    )
  }

  consume(r: RegExp | string) {
    const ret = this.isMatching(r)
    if (!ret) {
      throw new Error(`Expected ${r} at position ${this.offset} but found: ${this.synopsis().lookingAt}`)
    }

    this.offset += ret.length
    return ret
  }

  consumeIf(r: RegExp | string) {
    const ret = this.isMatching(r)
    if (!ret) {
      return undefined
    }

    return this.consume(r)
  }

  isMatching(r: RegExp | string) {
    if (typeof r === 'string') {
      if (this.curr().startsWith(r)) {
        return r
      }
      return undefined
    }

    const m = this.curr().match(r)
    if (m && m.index === 0) {
      return m[0]
    }

    return undefined
  }
}

class Value {
  constructor(private readonly nat: number) {}

  not() {
    return new Value(Number(!this.nat))
  }

  plus(that: Value) {
    return new Value(this.nat + that.nat)
  }
  minus(that: Value) {
    return new Value(this.nat - that.nat)
  }
  times(that: Value) {
    return new Value(this.nat * that.nat)
  }
  over(that: Value) {
    return new Value(this.nat / that.nat)
  }

  export() {
    return this.nat
  }
}
