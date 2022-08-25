import { Lambda } from './ast-node'
import { SymbolTable } from './symbol-table'

type Inner =
  | { tag: 'num'; val: number }
  | { tag: 'bool'; val: boolean }
  | { tag: 'str'; val: string }
  | { tag: 'arr'; val: Value[] }
  | { tag: 'obj'; val: Record<string, Value> }
  | { tag: 'lambda'; val: { ast: Lambda; table: SymbolTable } }

export class Value {
  private constructor(private readonly inner: Inner) {}

  static bool(val: boolean): Value {
    return new Value({ val, tag: 'bool' })
  }
  static num(val: number): Value {
    return new Value({ val, tag: 'num' })
  }
  static str(val: string): Value {
    return new Value({ val, tag: 'str' })
  }
  static arr(val: Value[]): Value {
    return new Value({ val, tag: 'arr' })
  }
  static obj(val: Record<string, Value>): Value {
    return new Value({ val, tag: 'obj' })
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

  assertStr(): string {
    if (this.inner.tag === 'str') {
      return this.inner.val
    }

    throw new Error(`Not a string: ${JSON.stringify(this.inner.val)}`)
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

    if (this.inner.tag === 'str') {
      return Value.str(this.inner.val + that.inner.val)
    }

    throw new Error(`Type error: operator cannot be applied to operands of type ${this.inner.tag}, ${that.inner.tag}`)
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
    if (this.inner.tag === 'num') {
      const d = this.minus(that)?.inner.val
      return d < 0 ? -1 : d > 0 ? 1 : 0
    }

    if (this.inner.tag === 'str') {
      const rhs = that.assertStr()

      const d = this.inner.val.localeCompare(rhs)
      return d < 0 ? -1 : d > 0 ? 1 : 0
    }
    if (this.inner.tag === 'bool') {
      const lhs = this.assertBool()
      const rhs = that.assertBool()

      return lhs && !rhs ? 1 : !lhs && rhs ? -1 : 0
    }

    throw new Error(`Cannot compare when the left-hand-side value is of type ${this.inner.tag}`)
  }

  toJSON() {
    return this.inner.val
  }

  export() {
    return JSON.parse(JSON.stringify(this))
  }
}
