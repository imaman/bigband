import { Lambda } from './ast-node'
import { SymbolTable } from './symbol-table'

type Inner =
  | { tag: 'num'; val: number }
  | { tag: 'bool'; val: boolean }
  | { tag: 'lambda'; val: { ast: Lambda; table: SymbolTable } }

export class Value {
  private constructor(private readonly inner: Inner) {}

  static bool(val: boolean): Value {
    return new Value({ val, tag: 'bool' })
  }
  static num(val: number): Value {
    return new Value({ val, tag: 'num' })
  }
  static lambda(ast: Lambda, table: SymbolTable): Value {
    return new Value({ val: { ast, table }, tag: 'lambda' })
  }

  assertBool(): boolean {
    if (this.inner.tag === 'bool') {
      return this.inner.val
    }

    throw new Error(`Not a boolean: ${JSON.stringify(this.inner.val)}`)
  }

  assertLambda() {
    if (this.inner.tag === 'lambda') {
      return this.inner.val
    }

    throw new Error(`Not a lambda: ${JSON.stringify(this.inner.val)}`)
  }

  or(that: Value) {
    if (this.inner.tag === 'bool' && that.inner.tag === 'bool') {
      return Value.bool(this.inner.val || that.inner.val)
    }

    this.requireType('bool')
    that.requireType('bool')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }

  and(that: Value) {
    if (this.inner.tag === 'bool' && that.inner.tag === 'bool') {
      return Value.bool(this.inner.val && that.inner.val)
    }

    this.requireType('bool')
    that.requireType('bool')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }

  equalsTo(that: Value) {
    if (this.inner.tag !== that.inner.tag) {
      return Value.bool(false)
    }

    // TODO(imaman): much better comparison is needed here
    const b = JSON.stringify(this.inner.val) === JSON.stringify(that.inner.val)
    return Value.bool(b)
  }

  not() {
    if (this.inner.tag === 'bool') {
      return Value.bool(!this.inner.val)
    }

    this.requireType('bool')
    throw new Error(`Inconsistent types: ${this.inner.tag}`)
  }

  requireType(t: string) {
    if (this.inner.tag !== t) {
      throw new Error(`value type error: expected ${t} but found: ${this.inner.val}`)
    }
  }

  plus(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val + that.inner.val)
    }

    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  minus(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val - that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  times(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val * that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  power(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val ** that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  over(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val / that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }
  modulo(that: Value) {
    if (this.inner.tag === 'num' && that.inner.tag === 'num') {
      return Value.num(this.inner.val % that.inner.val)
    }
    this.requireType('num')
    that.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}, ${that.inner.tag}`)
  }

  negate() {
    if (this.inner.tag === 'num') {
      return Value.num(-this.inner.val)
    }
    this.requireType('num')
    throw new Error(`Inconsistent types: ${this.inner.tag}`)
  }

  compare(that: Value) {
    const d = this.minus(that)?.inner.val
    if (d < 0) {
      return -1
    }

    if (d > 0) {
      return 1
    }

    return 0
  }

  export() {
    return this.inner.val
  }
}
