import { Lambda, show } from './ast-node'
import { findArrayMethod } from './find-array-method'
import { findStringMethod } from './find-string-method'
import { Runtime } from './runtime'
import { shouldNeverHappen } from './should-never-happen'
import { SymbolTable } from './symbol-table'

type Inner =
  | { tag: 'num'; val: number }
  | { tag: 'bool'; val: boolean }
  | { tag: 'str'; val: string }
  | { tag: 'arr'; val: Value[] }
  | { tag: 'obj'; val: Record<string, Value> }
  | { tag: 'lambda'; val: { ast: Lambda; table: SymbolTable } }
  | { tag: 'foreign'; val: (...args: Value[]) => unknown }

type InferTag<Q> = Q extends { tag: infer B } ? (B extends string ? B : never) : never
type Tag = InferTag<Inner>

type X = {
  num: (arg: number, tag: Tag) => Value
  bool: (arg: boolean, tag: Tag) => Value
  str: (arg: string, tag: Tag) => Value
  arr: (arg: Value[], tag: Tag) => Value
  obj: (arg: Record<string, Value>, tag: Tag) => Value
  lambda: (arg: { ast: Lambda; table: SymbolTable }, tag: Tag) => Value
  foreign: (arg: (...args: Value[]) => unknown, tag: Tag) => Value
}

const badType = (expected: Tag) => (_ignore: unknown, actual: Tag) => {
  throw new Error(`value type error: expected ${expected} but found ${actual}`)
}

function onVal(inner: Inner, cases: X): Value {
  if (inner.tag === 'arr') {
    return cases.arr(inner.val, inner.tag)
  }
  if (inner.tag === 'bool') {
    return cases.bool(inner.val, inner.tag)
  }
  if (inner.tag === 'foreign') {
    return cases.foreign(inner.val, inner.tag)
  }
  if (inner.tag === 'lambda') {
    return cases.lambda(inner.val, inner.tag)
  }
  if (inner.tag === 'num') {
    return cases.num(inner.val, inner.tag)
  }
  if (inner.tag === 'obj') {
    return cases.obj(inner.val, inner.tag)
  }
  if (inner.tag === 'str') {
    return cases.str(inner.val, inner.tag)
  }

  shouldNeverHappen(inner)
}

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

  static foreign(f: (...args: Value[]) => unknown) {
    return new Value({ tag: 'foreign', val: f })
  }

  unwrap(t: Tag): unknown
  unwrap(): unknown
  unwrap(t?: Tag): unknown {
    if (t !== undefined) {
      if (t !== this.inner.tag) {
        throw new Error(`Type mismatch: expected <${t}> but actual type is <${this.inner.tag}>`)
      }
    }

    return this.inner.val
  }

  assertBool(): boolean {
    if (this.inner.tag === 'bool') {
      return this.inner.val
    }

    throw new Error(`Not a boolean: ${JSON.stringify(this.inner.val)}`)
  }

  assertNum(): number {
    if (this.inner.tag === 'num') {
      return this.inner.val
    }

    throw new Error(`Not a number: ${JSON.stringify(this.inner.val)}`)
  }

  assertStr(): string {
    if (this.inner.tag === 'str') {
      return this.inner.val
    }

    throw new Error(`Not a string: ${JSON.stringify(this.inner.val)}`)
  }

  assertArr(): unknown[] {
    if (this.inner.tag === 'arr') {
      return this.inner.val
    }

    throw new Error(`Not an array: ${JSON.stringify(this.inner.val)}`)
  }

  assertObj(): Record<string, Value> {
    if (this.inner.tag === 'obj') {
      return this.inner.val
    }

    throw new Error(`Not an object: ${JSON.stringify(this.inner.val)}`)
  }

  assertLambda() {
    if (this.inner.tag === 'lambda') {
      return this.inner.val
    }

    throw new Error(`Not a lambda: ${JSON.stringify(this.inner.val)}`)
  }

  isLambda() {
    return this.inner.tag === 'lambda'
  }

  or(that: Value) {
    const err = badType('bool')
    return onVal(this.inner, {
      arr: err,
      bool: lhs =>
        onVal(that.inner, {
          arr: err,
          bool: rhs => Value.bool(lhs || rhs),
          foreign: err,
          lambda: err,
          num: err,
          obj: err,
          str: err,
        }),
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      str: err,
    })
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

  static toStringOrNumber(indexValue: string | Value): string | number {
    if (typeof indexValue === 'string') {
      return indexValue
    } else {
      const i = indexValue.inner
      if (i.tag == 'str') {
        return i.val
      } else if (i.tag === 'num') {
        return i.val
      } else if (i.tag === 'arr' || i.tag === 'bool' || i.tag == 'lambda' || i.tag === 'obj' || i.tag === 'foreign') {
        throw new Error(`Invalid index value: ${indexValue}`)
      } else {
        shouldNeverHappen(i)
      }
    }
  }

  access(indexValue: string | Value, runtime?: Runtime): Value {
    if (this.inner.tag === 'obj') {
      const index = Value.toStringOrNumber(indexValue)
      return this.inner.val[index]
    }
    if (this.inner.tag === 'arr') {
      if (typeof indexValue === 'string') {
        return findArrayMethod(this.inner.val, indexValue, runtime)
      }

      const i: number = indexValue.assertNum()
      if (i < 0 || i > this.inner.val.length) {
        throw new Error(`array index (${i}) is out of bounds (length = ${this.inner.val.length})`)
      }
      return this.inner.val[i]
    }

    if (this.inner.tag === 'str') {
      return findStringMethod(this.inner.val, indexValue)
    }

    if (
      this.inner.tag === 'bool' ||
      this.inner.tag === 'lambda' ||
      this.inner.tag === 'num' ||
      this.inner.tag === 'foreign'
    ) {
      throw new Error(`Cannot access an object of type ${this.inner.tag}`)
    }

    shouldNeverHappen(this.inner)
  }

  callForeign(args: Value[]) {
    if (this.inner.tag === 'foreign') {
      const output = this.inner.val(...args)
      return from(output)
    }

    if (
      this.inner.tag === 'bool' ||
      this.inner.tag === 'lambda' ||
      this.inner.tag === 'num' ||
      this.inner.tag === 'str' ||
      this.inner.tag === 'arr' ||
      this.inner.tag === 'obj'
    ) {
      throw new Error(`Not a foreign function: ${this.inner.tag}`)
    }

    shouldNeverHappen(this.inner)
  }

  toString() {
    return this.inner.val.toString()
  }

  toJSON() {
    if (this.inner.tag === 'lambda') {
      return { _lambda: show(this.inner.val.ast) }
    }
    if (this.inner.tag === 'foreign') {
      return { _foreign: this.inner.val.toString() }
    }

    return this.inner.val
  }

  export() {
    return JSON.parse(JSON.stringify(this))
  }

  static from(u: unknown) {
    return from(u)
  }
}

function from(u: unknown): Value {
  if (u instanceof Value) {
    return u
  }
  if (typeof u === 'boolean') {
    return Value.bool(u)
  }
  if (typeof u === 'number') {
    return Value.num(u)
  }
  if (typeof u === 'string') {
    return Value.str(u)
  }
  if (Array.isArray(u)) {
    return Value.arr(u.map(curr => from(curr)))
  }

  if (typeof u === 'undefined') {
    throw new Error(`Cannot convert undefined to Value`)
  }

  if (u && typeof u === 'object') {
    Value.obj(Object.fromEntries(Object.entries(u).map(([k, v]) => [k, from(v)])))
  }

  throw new Error(`cannot convert ${JSON.stringify(u)} to Value`)
}
