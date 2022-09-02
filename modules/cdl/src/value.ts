import { Lambda, show } from './ast-node'
import { failMe } from './fail-me'
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

type Cases = {
  num: (arg: number, tag: Tag) => unknown
  bool: (arg: boolean, tag: Tag) => unknown
  str: (arg: string, tag: Tag) => unknown
  arr: (arg: Value[], tag: Tag) => unknown
  obj: (arg: Record<string, Value>, tag: Tag) => unknown
  lambda: (arg: { ast: Lambda; table: SymbolTable }, tag: Tag) => unknown
  foreign: (arg: (...args: Value[]) => unknown, tag: Tag) => unknown
}

import * as util from 'util'

const badType = (expected: Tag) => (u: unknown, _actual: Tag) => {
  throw new Error(`value type error: expected ${expected} but found ${util.inspect(u)}`)
}

function select(v: Value, cases: Cases): Value {
  const selectUnknown = () => {
    const inner = v.inner
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

  return Value.from(selectUnknown())
}

export class Value {
  private constructor(readonly inner: Inner) {}

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
    return select(this, {
      arr: err,
      bool: lhs =>
        select(that, {
          arr: err,
          bool: rhs => lhs || rhs,
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
    const err = badType('bool')
    return select(this, {
      arr: err,
      bool: lhs =>
        select(that, {
          arr: err,
          bool: rhs => lhs && rhs,
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

  equalsTo(that: Value) {
    if (this.inner.tag !== that.inner.tag) {
      return Value.bool(false)
    }

    // TODO(imaman): much better comparison is needed here
    const b = JSON.stringify(this.inner.val) === JSON.stringify(that.inner.val)
    return Value.bool(b)
  }

  not() {
    const err = badType('bool')
    return select(this, {
      arr: err,
      bool: lhs => !lhs,
      foreign: err,
      lambda: err,
      num: err,
      obj: err,
      str: err,
    })
  }

  private binaryNumericOperator(a: Value, b: Value, f: (lhs: number, rhs: number) => number) {
    const err = badType('num')
    return select(a, {
      arr: err,
      bool: err,
      foreign: err,
      lambda: err,
      num: lhs =>
        select(b, {
          arr: err,
          bool: err,
          foreign: err,
          lambda: err,
          num: rhs => f(lhs, rhs),
          obj: err,
          str: err,
        }),
      obj: err,
      str: err,
    })
  }

  plus(that: Value) {
    const errNum = badType('num')
    return select(this, {
      arr: errNum,
      bool: errNum,
      foreign: errNum,
      lambda: errNum,
      num: lhs =>
        select(that, {
          arr: errNum,
          bool: errNum,
          foreign: errNum,
          lambda: errNum,
          num: rhs => lhs + rhs,
          obj: errNum,
          str: errNum,
        }),
      obj: errNum,
      str: lhs =>
        select(that, {
          arr: rhs => lhs + rhs,
          bool: rhs => lhs + rhs,
          foreign: rhs => lhs + rhs,
          lambda: rhs => lhs + rhs,
          num: rhs => lhs + rhs,
          obj: rhs => lhs + rhs,
          str: rhs => lhs + rhs,
        }),
    })
  }
  minus(that: Value) {
    return this.binaryNumericOperator(this, that, (a, b) => a - b)
  }
  times(that: Value) {
    return this.binaryNumericOperator(this, that, (a, b) => a * b)
  }
  power(that: Value) {
    return this.binaryNumericOperator(this, that, (a, b) => a ** b)
  }
  over(that: Value) {
    return this.binaryNumericOperator(this, that, (a, b) => a / b)
  }
  modulo(that: Value) {
    return this.binaryNumericOperator(this, that, (a, b) => a % b)
  }

  negate() {
    return Value.num(0).minus(this)
  }

  compare(that: Value) {
    if (this.inner.tag === 'num') {
      const d = this.minus(that).inner.val
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
    const err = (_ignore: unknown, t: Tag) => failMe(`Cannot access an object of type ${t}`)

    return select(this, {
      arr: a => {
        if (typeof indexValue === 'string') {
          return findArrayMethod(a, indexValue, runtime)
        }

        const i: number = indexValue.assertNum()
        if (i < 0 || i > a.length) {
          throw new Error(`array index (${i}) is out of bounds (length = ${a.length})`)
        }
        return a[i]
      },
      bool: err,
      foreign: err,
      lambda: err,
      num: err,
      obj: o => o[Value.toStringOrNumber(indexValue)],
      str: s => findStringMethod(s, indexValue),
    })
  }

  callForeign(args: Value[]) {
    const err = (_ignore: unknown, t: Tag) => failMe(`Not a foreign function: ${t}`)
    return select(this, {
      arr: err,
      bool: err,
      foreign: f => from(f(...args)),
      lambda: err,
      num: err,
      obj: err,
      str: err,
    })
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
